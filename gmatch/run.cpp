/**
 * Usage:
 *  ./run 100 [data graph file] [query graph string]
 */

#include "graph.h"
#include "GenerateQueryPlan.h"
#include "FilterVertices.h"
#include "BuildTable.h"
#include "intersection/computesetintersection.h"


void generateBN(Graph &query_graph, ui *order, ui **&bn, ui *&bn_count) 
{
    ui query_vertices_num = query_graph.getVerticesCount();
    bn_count = new ui[query_vertices_num];
    std::fill(bn_count, bn_count + query_vertices_num, 0);
    bn = new ui *[query_vertices_num];
    for (ui i = 0; i < query_vertices_num; ++i) {
        bn[i] = new ui[query_vertices_num];
    }

    std::vector<bool> visited_vertices(query_vertices_num, false);
    visited_vertices[order[0]] = true;
    for (ui i = 1; i < query_vertices_num; ++i) {
        ui vertex = order[i];

        ui nbrs_cnt;
        const ui *nbrs = query_graph.getVertexNeighbors(vertex, nbrs_cnt);
        for (ui j = 0; j < nbrs_cnt; ++j) {
            ui nbr = nbrs[j];

            if (visited_vertices[nbr]) {
                bn[i][bn_count[i]++] = nbr;
            }
        }
        visited_vertices[vertex] = true;
    }

    /**
    std::cout << "======= BN ========" << std::endl;
    for (int i = 1; i < query_vertices_num; ++i)
    {
        for (int j = 0; j < bn_count[i]; ++j)
        {
            std::cout << bn[i][j] << " ";
        }
        std::cout << std::endl;
    }
    std::cout << "==================" << std::endl;
    */
}

void generateValidCandidateIndex(ui depth, ui *idx_embedding, ui *idx_count, ui **valid_candidate_index,
                                Edges ***edge_matrix, ui **bn, ui *bn_cnt, ui *order, ui *temp_buffer_)
{

    ui u = order[depth];
    ui previous_bn = bn[depth][0];
    ui previous_index_id = idx_embedding[previous_bn];
    ui valid_candidates_count = 0;


    Edges& previous_edge = *edge_matrix[previous_bn][u];

    valid_candidates_count = previous_edge.offset_[previous_index_id + 1] - previous_edge.offset_[previous_index_id];
    ui* previous_candidates = previous_edge.edge_ + previous_edge.offset_[previous_index_id];

    memcpy(valid_candidate_index[depth], previous_candidates, valid_candidates_count * sizeof(ui));
    
    ui temp_count;
    for (ui i = 1; i < bn_cnt[depth]; ++i) {
        
        ui current_bn = bn[depth][i];

        Edges& current_edge = *edge_matrix[current_bn][u];
        ui current_index_id = idx_embedding[current_bn];


        ui current_candidates_count = current_edge.offset_[current_index_id + 1] - current_edge.offset_[current_index_id];

        ui* current_candidates = current_edge.edge_ + current_edge.offset_[current_index_id];

        if (current_candidates_count < valid_candidates_count)
            ComputeSetIntersection::ComputeCandidates(current_candidates, current_candidates_count, valid_candidate_index[depth], valid_candidates_count,
                        temp_buffer_, temp_count);
        else
            ComputeSetIntersection::ComputeCandidates(valid_candidate_index[depth], valid_candidates_count, current_candidates, current_candidates_count,
                        temp_buffer_, temp_count);
        

        // std::swap(temp_buffer, valid_candidate_index[depth]); // all elements are swapped

        for(int i = 0; i < temp_count; ++i)
        {
            valid_candidate_index[depth][i] = temp_buffer_[i];
        }
        valid_candidates_count = temp_count;
    }

    idx_count[depth] = valid_candidates_count;
}


int main(int argc, char *argv[])
{
    ui max_results_found = atoi(argv[1]);
    Graph data_graph, query_graph;
    std::string dp = std::string(argv[2]);
    // std::string qp = std::string(argv[3]);
    std::string qp= "";
    for (ui i = 3; i < argc; i++)
        qp.append(std::string(argv[i]).append(" "));
    // std::string qp = "t 8 20 v 0 0 4 v 1 1 4 v 2 1 7 v 3 1 4 v 4 0 6 v 5 0 7 v 6 0 5 v 7 0 3 e 0 1 e 0 2 e 0 4 e 0 5 e 1 2 e 1 4 e 1 5 e 2 3 e 2 4 e 2 5 e 2 6 e 2 7 e 3 4 e 3 5 e 3 6 e 4 5 e 4 6 e 5 6 e 5 7 e 6 7";
    data_graph.loadGraphFromFile(dp);
    query_graph.loadGraphFromString(qp);

    // ============== resources needed by query ============== 
    ui **candidates;
    ui *candidates_count;
    ui *bfs_order, *matching_order, *pivot;
    TreeNode *tree;
    Edges ***edge_matrix;
    ui **bn;
    ui *bn_count;
    ui max_candidate_cnt = 0;
    // ========================================================

    // ============== Step 1. Filtering =======================
    FilterVertices::DPisoFilter(data_graph, query_graph, candidates, candidates_count, 
                                        bfs_order, tree);      
    FilterVertices::sortCandidates(candidates, candidates_count, query_graph.getVerticesCount());

    for (ui i = 0; i < query_graph.getVerticesCount(); ++i)
    {
        max_candidate_cnt = std::max(max_candidate_cnt, candidates_count[i]);
    }
    // std::cout << "MAX CANDS : " << max_candidate_cnt << std::endl;

    // ============== Step 1. Filtering Done =======================


    // ============== Step 2. Ordering =============================

    GenerateQueryPlan::generateGQLQueryPlan(data_graph, query_graph, candidates_count, 
                                                matching_order, pivot);

    /**
    std::cout<<"======= print matching order =========="<<std::endl;
    for(ui i=0; i<query_graph.getVerticesCount(); i++) {
        std::cout<<matching_order[i]<<" ";
    }
    std::cout<<std::endl;
    */

    generateBN(query_graph, matching_order, bn, bn_count);
    edge_matrix = new Edges **[query_graph.getVerticesCount()];
    for (ui i = 0; i < query_graph.getVerticesCount(); ++i) {
        edge_matrix[i] = new Edges *[query_graph.getVerticesCount()];
    }
    BuildTable::buildTable(data_graph, query_graph, candidates, candidates_count, edge_matrix);

    // ============== Step 2. Ordering Done =============================


    size_t counter = 0;
    ui *temp_buffer;
    bool *visited_arr;
    ui *idx;
    ui *idx_count;
    ui **valid_candidate_idx;
    temp_buffer = new ui[max_candidate_cnt];

    // allocate space for visited_arr array
    visited_arr = new bool[data_graph.getVerticesCount()];
    memset(visited_arr, false, sizeof(bool)*data_graph.getVerticesCount());

    // allocate space for idx and idx_count array
    idx = new ui[query_graph.getVerticesCount()];
    idx_count = new ui[query_graph.getVerticesCount()];

    // allocate space for valid candidate 2-dimensional array
    valid_candidate_idx = new ui*[query_graph.getVerticesCount()];
    for (ui i = 0; i < query_graph.getVerticesCount(); ++i) {
        valid_candidate_idx[i] = new ui[max_candidate_cnt];
    }
            
    ui query_vertices_num = query_graph.getVerticesCount();
    ui *embedding = new ui[query_graph.getVerticesCount()];
    ui *idx_embedding = new ui[query_graph.getVerticesCount()];

    // ================ Step 3. Enumeration ====================
    int cur_depth = 0;
    int max_depth = query_graph.getVerticesCount();
    ui start_vertex = matching_order[0];
    idx[cur_depth] = 0;
    idx_count[cur_depth] = candidates_count[start_vertex];
    for (ui i = 0; i < idx_count[cur_depth]; ++i) {
        valid_candidate_idx[cur_depth][i] = i;
    }

    while (true) {
        while (idx[cur_depth] < idx_count[cur_depth]) {
            ui valid_idx = valid_candidate_idx[cur_depth][idx[cur_depth]];

            ui u = matching_order[cur_depth];
            
            ui v = candidates[u][valid_idx];

            if (visited_arr[v]) {
                idx[cur_depth] += 1;
                continue;
            }

            embedding[u] = v;
            idx_embedding[u] = valid_idx;

            visited_arr[v] = true;

            idx[cur_depth] += 1;

            if (cur_depth == max_depth - 1) {
                    
                counter += 1;

                // print first 10000 results
                if (counter < max_results_found)
                {
                    for(ui i = 0; i < max_depth; ++i)
                    {
                        std::cout << embedding[i] << " ";
                    }
                    std::cout << std::endl;
                }
                else if (counter == max_results_found)
                {
                    goto EXIT;
                }

                visited_arr[v] = false;
                continue;
            }
            cur_depth += 1;
            idx[cur_depth] = 0;
            generateValidCandidateIndex(cur_depth, idx_embedding, idx_count, valid_candidate_idx, edge_matrix, bn, bn_count, matching_order, temp_buffer);
        }
        cur_depth -= 1;
        if (cur_depth < 0)
            break;
        else
        {
            visited_arr[embedding[matching_order[cur_depth]]] = false;
        }
    }
EXIT: 

    // ================ Step 3. Enumeration Done ====================

    // ================ Deletion =================

    for(ui i=0; i<query_graph.getVerticesCount(); ++i) {
        delete[] bn[i];
        delete[] candidates[i];
        for (ui j=0; j<query_graph.getVerticesCount(); ++j) {
            delete edge_matrix[i][j];
        }
        delete[] edge_matrix[i];
    }
    delete[] bn;
    delete[] bn_count;
    delete[] candidates_count;
    delete[] candidates;
    delete[] edge_matrix;
    delete[] bfs_order;
    delete[] matching_order;
    delete[] pivot;
    delete[] tree;

    delete[] embedding;
    delete[] idx_embedding;

    delete[] temp_buffer;
    delete[] visited_arr;
    delete[] idx;
    delete[] idx_count;

    for (ui i = 0; i < query_graph.getVerticesCount(); ++i) {
        delete[] valid_candidate_idx[i];
    }
    delete[] valid_candidate_idx;

    // ================ Deletion Done =============
}

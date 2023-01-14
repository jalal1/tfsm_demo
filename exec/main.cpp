/**
 * Complie:
 *  g++ main.cpp
 * Usage: 
 *  Load:
 *  ./a.out -l data_graph.graph -n neighbor.txt -o offset.txt -p label.txt
 *  Query:
 *  ./a.out -n neighbor.txt -o offset.txt -p label.txt -t 10
 *  Union graph:
 *  ./a.out -n neighbor.txt -o offset.txt -p label.txt -u union_graph.graph 7 8 9 10 11 12 13 
 *  Expansion graph:
 *  ./a.out -n neighbor.txt -o offset.txt -p label.txt -e expansion_graph.graph 7 8 9 10 11 12 13 
 *  
 */

#include <fstream>
#include <iostream>
#include <vector>
#include <algorithm>
#include <string.h>
#include <unistd.h>
#include <stdio.h>
#include <map>
#include <set>
#include <unordered_set>

typedef unsigned int ui;
typedef std::map<ui, std::set<ui> > Adj_t;

void loadGraph(std::string &file_path, std::string &file_neighbor, std::string &file_offset, std::string &file_label) {

    std::cout << file_path << std::endl;
    std::ifstream infile(file_path);

    if (!infile.is_open()) {
        std::cout << "Can not open the graph file " << file_path << " ." << std::endl;
        exit(-1);
    }

    ui vertices_count, edges_count;
    ui *offsets, *neighbors; 
    char type;
    infile >> type >> vertices_count >> edges_count;

    std::cout << vertices_count << " " << edges_count << std::endl;

    offsets = new ui[vertices_count + 1];
    offsets[0] = 0;
    int *labels = new int[vertices_count];

    neighbors = new ui[edges_count * 2];

    ui max_label_id = 0;
    std::vector<ui> neighbors_offset(vertices_count, 0);

    while (infile >> type) {
        if (type == 'v') { // Read vertex.
            ui id;
            ui label;
            ui degree;
            infile >> id >> label >> degree;

            offsets[id + 1] = offsets[id] + degree;
            labels[id] = label;
        }
        else if (type == 'e') { // Read edge.
            ui begin;
            ui end;
            infile >> begin >> end;

            ui offset = offsets[begin] + neighbors_offset[begin];
            neighbors[offset] = end;

            offset = offsets[end] + neighbors_offset[end];
            neighbors[offset] = begin;

            neighbors_offset[begin] += 1;
            neighbors_offset[end] += 1;
        }
    }

    infile.close();

    for (ui i = 0; i < vertices_count; ++i) {
        std::sort(neighbors + offsets[i], neighbors + offsets[i + 1]);
    }

    FILE *foffset = fopen(file_offset.c_str(), "wb");
    FILE *fneighbor = fopen(file_neighbor.c_str(), "wb");
    FILE *flabel = fopen(file_label.c_str(), "wb");

    std::cout << fwrite(&vertices_count, sizeof(ui), 1, foffset) << std::endl; 
    std::cout << fwrite(&edges_count, sizeof(ui), 1, foffset) << std::endl;
    std::cout << fwrite(offsets, sizeof(ui), vertices_count + 1, foffset) << std::endl;
    std::cout << fwrite(neighbors, sizeof(ui), edges_count * 2, fneighbor) << std::endl;
    std::cout << fwrite(labels, sizeof(int), vertices_count, flabel) << std::endl;

    // for(size_t i=0; i<edges_count * 2; ++i)
    // {
    //     std::cout << neighbors[i] << '\n';
    // }


    fclose(foffset);
    fclose(fneighbor);

    delete[] neighbors;
    delete[] offsets;

}

int main(int argc, char *argv[])
{
    bool load = false, test = false, getunion = false, getexpansion = false;
    char *filename, *file_neighbor, *file_offset, *file_label, *union_graph_name, *expansion_graph_name; 
    ui testID;
    int option;
    std::set<ui> union_vertices, expansion_vertices;
    while((option = getopt(argc, argv, "l:t:n:o:p:u:e:")) != -1)
    {
        switch (option)
        {
        case 'l':
            load = true;
            filename = strdup(optarg);
            break;
        case 't':
            test = true;
            testID = atoi(optarg);
            break;
        case 'n':
            file_neighbor = strdup(optarg);
            break;
        case 'o':
            file_offset = strdup(optarg);
            break;
        case 'p':
            file_label = strdup(optarg);
            break;
        case 'u':
            getunion = true;
            union_graph_name = strdup(optarg);
            optind++;
            while (argv[optind-1])
            {
                union_vertices.insert(atoi(argv[optind-1]));
                optind++;
            }
            break;
        case 'e':
            getexpansion = true;
            expansion_graph_name = strdup(optarg);
            optind++;
            while (argv[optind-1])
            {
                expansion_vertices.insert(atoi(argv[optind-1]));
                optind++;
            }
            break;
        default:
            exit(-1);
        }
    }

    // std::cout << filename << std::endl;

    if (getunion)
    {
        std::cout << "Union Vertices: ";
        for (auto it=union_vertices.begin(); it!=union_vertices.end(); ++it)
        {
            std::cout << *it << " ";
        }
        std::cout << std::endl;

        FILE *foffset = fopen(file_offset, "rb");
        FILE *fneighbor = fopen(file_neighbor, "rb");
        FILE *flabel = fopen(file_label, "rb");
        FILE *funion_graph = fopen(union_graph_name, "rb");

        Adj_t UnionAdj;
        ui num_edges = 0;
        for (auto it=union_vertices.begin(); it!=union_vertices.end(); ++it)
        {
            ui vid = *it;
            if (UnionAdj.find(vid) == UnionAdj.end())
            {
                UnionAdj[vid] = std::set<ui>();
            }
            ui start, end;
            fseek(foffset, sizeof(ui)*(vid+2), SEEK_SET);
            fread(&start, sizeof(ui),1,foffset);
            fread(&end, sizeof(ui),1,foffset);

            ui *neighbors = new ui[end-start];
            int label;

            fseek(fneighbor, sizeof(ui)*start, SEEK_SET);
            fread(neighbors, sizeof(ui), end-start, fneighbor);

            fseek(flabel, sizeof(ui)*vid, SEEK_SET);
            fread(&label, sizeof(int), 1, flabel);

            for (size_t j=0; j<end-start; ++j)
            {
                ui ne = neighbors[j];
                if (union_vertices.find(ne) == union_vertices.end()) 
                    continue;
                if (UnionAdj.find(ne) == UnionAdj.end())
                {
                    UnionAdj[ne] = std::set<ui>();
                }
                
                UnionAdj[vid].insert(ne); 
                UnionAdj[ne].insert(vid);

                num_edges ++;
            }
        }
        // print union graph
        // for (auto it=UnionAdj.begin(); it!=UnionAdj.end(); ++it)
        // {
        //     num_edges += it->second.size();
        // }

        ui num_vertices = union_vertices.size();


        std::ofstream myfile;
        myfile.open(std::string(union_graph_name));
        myfile << num_vertices << " " << num_edges/2 << std::endl;
        for (auto it=union_vertices.begin(); it!=union_vertices.end(); ++it)
        {
            ui vid = *it;
            int label; 
            fseek(flabel, sizeof(ui)*vid, SEEK_SET);
            fread(&label, sizeof(int), 1, flabel);
            myfile << "v " << vid << " " << label << " " << UnionAdj[vid].size() << std::endl;
        }
        for (auto it=union_vertices.begin(); it!=union_vertices.end(); ++it)
        {
            ui vid = *it;
            for (auto it2=UnionAdj[vid].begin(); it2!=UnionAdj[vid].end(); ++it2)
            {
                ui ne = *it2;
                if (vid < ne)
                    myfile << "e " << vid << " " << ne <<std::endl;
            }
        }
        myfile.close();
    
    }

    if (getexpansion)
    {
        std::cout << "Expansion Vertices: ";
        for (auto it=expansion_vertices.begin(); it!=expansion_vertices.end(); ++it)
        {
            std::cout << *it << " ";
        }
        std::cout << std::endl;

        FILE *foffset = fopen(file_offset, "rb");
        FILE *fneighbor = fopen(file_neighbor, "rb");
        FILE *flabel = fopen(file_label, "rb");
        // FILE *fexpansion_graph = fopen(expansion_graph_name, "rb");


        Adj_t ExpAdj;
        ui num_edges = 0;
        for (auto it=expansion_vertices.begin(); it!=expansion_vertices.end(); ++it)
        {
            ui vid = *it;
            if (ExpAdj.find(vid) == ExpAdj.end())
            {
                ExpAdj[vid] = std::set<ui>();
            }
            ui start, end;
            fseek(foffset, sizeof(ui)*(vid+2), SEEK_SET);
            fread(&start, sizeof(ui),1,foffset);
            fread(&end, sizeof(ui),1,foffset);

            ui *neighbors = new ui[end-start];
            int label;

            fseek(fneighbor, sizeof(ui)*start, SEEK_SET);
            fread(neighbors, sizeof(ui), end-start, fneighbor);

            fseek(flabel, sizeof(ui)*vid, SEEK_SET);
            fread(&label, sizeof(int), 1, flabel);

            for (size_t j=0; j<end-start; ++j)
            {
                ui ne = neighbors[j];
                if (ExpAdj.find(ne) == ExpAdj.end())
                {
                    ExpAdj[ne] = std::set<ui>();
                }
                
                ExpAdj[vid].insert(ne); 
                ExpAdj[ne].insert(vid);

                num_edges ++;
            }
        }

        ui num_vertices = expansion_vertices.size();

        std::ofstream myfile;
        myfile.open(std::string(expansion_graph_name));
        myfile << num_vertices << " " << num_edges/2 << std::endl;
        for (auto it=ExpAdj.begin(); it!=ExpAdj.end(); ++it)
        {
            ui vid = it->first;
            int label; 
            fseek(flabel, sizeof(ui)*vid, SEEK_SET);
            fread(&label, sizeof(int), 1, flabel);
            myfile << "v " << vid << " " << label << " " << ExpAdj[vid].size() << std::endl;
        }
        for (auto it=ExpAdj.begin(); it!=ExpAdj.end(); ++it)
        {
            ui vid = it->first;
            for (auto it2=ExpAdj[vid].begin(); it2!=ExpAdj[vid].end(); ++it2)
            {
                ui ne = *it2;
                if (vid < ne)
                    myfile << "e " << vid << " " << ne <<std::endl;
            }
        }
        myfile.close();
    
    }

    if (load)
    {
        std::string fp = std::string(filename);
        std::string fn = std::string(file_neighbor);
        std::string fo = std::string(file_offset);
        std::string fl = std::string(file_label);
        loadGraph(fp, fn, fo, fl);
    }
    if (test)
    {
        FILE *foffset = fopen(file_offset, "rb");
        FILE *fneighbor = fopen(file_neighbor, "rb");
        FILE *flabel = fopen(file_label, "rb");
        
        ui start, end;
        fseek(foffset, sizeof(ui)*(testID+2), SEEK_SET);
        fread(&start, sizeof(ui),1,foffset);
        fread(&end, sizeof(ui),1,foffset);

        // std::cout << start << " " << end << std::endl;

        ui *neighbors = new ui[end-start];
        int label;

        fseek(fneighbor, sizeof(ui)*start, SEEK_SET);
        fread(neighbors, sizeof(ui), end-start, fneighbor);

        fseek(flabel, sizeof(ui)*testID, SEEK_SET);
        fread(&label, sizeof(int), 1, flabel);

        for(size_t i=0; i<end-start; ++i)
        {
            std::cout << neighbors[i] << " ";
        }
        std::cout << std::endl;

        std::cout << "Label is: " << label << std::endl;

        fclose(foffset);
        fclose(fneighbor);
        fclose(flabel);
        delete[] neighbors;
    }
}
//
// Created by ssunah on 11/30/17.
//

#ifndef SUBGRAPHMATCHING_COMPUTE_SET_INTERSECTION_H
#define SUBGRAPHMATCHING_COMPUTE_SET_INTERSECTION_H

#include <immintrin.h>
#include <x86intrin.h>

/**
 * Set intersection method.
 * 0: Hybrid method; 1: Merge based set intersections.
 */
#define HYBRID 0

/**
 * Accelerate set intersection with SIMD instructions.
 * 0: AVX2; 1: AVX512; 2: Basic;
 */
#define SI 2


/*
 * Because the set intersection is designed for computing common neighbors, the target is uieger.
 */

typedef unsigned int ui;

typedef ui VertexID;
typedef ui LabelID;


class ComputeSetIntersection {
public:
#if HYBRID == 0
    static size_t galloping_cnt_;
    static size_t merge_cnt_;
#endif

    static void ComputeCandidates(const VertexID* larray, ui l_count, const VertexID* rarray,
                                  ui r_count, VertexID* cn, ui &cn_count);
    static void ComputeCandidates(const VertexID* larray, ui l_count, const VertexID* rarray,
                                  ui r_count, ui &cn_count);

#if SI == 0
    static void ComputeCNGallopingAVX2(const VertexID* larray, ui l_count,
                                       const VertexID* rarray, ui r_count, VertexID* cn,
                                       ui &cn_count);
    static void ComputeCNGallopingAVX2(const VertexID* larray, ui l_count,
                                       const VertexID* rarray, ui r_count, ui &cn_count);

    static void ComputeCNMergeBasedAVX2(const VertexID* larray, ui l_count, const VertexID* rarray,
                                        ui r_count, VertexID* cn, ui &cn_count);
    static void ComputeCNMergeBasedAVX2(const VertexID* larray, ui l_count, const VertexID* rarray,
                                        ui r_count, ui &cn_count);
    static const ui BinarySearchForGallopingSearchAVX2(const VertexID*  array, ui offset_beg, ui offset_end, ui val);
    static const ui GallopingSearchAVX2(const VertexID*  array, ui offset_beg, ui offset_end, ui val);
#elif SI == 1

    static void ComputeCNGallopingAVX512(const VertexID* larray, const ui l_count,
                                         const VertexID* rarray, const ui r_count, VertexID* cn,
                                         ui &cn_count);
    static void ComputeCNGallopingAVX512(const VertexID* larray, const ui l_count,
                                         const VertexID* rarray, const ui r_count, ui &cn_count);

    static void ComputeCNMergeBasedAVX512(const VertexID* larray, const ui l_count, const VertexID* rarray,
                                          const ui r_count, VertexID* cn, ui &cn_count);
    static void ComputeCNMergeBasedAVX512(const VertexID* larray, const ui l_count, const VertexID* rarray,
                                          const ui r_count, ui &cn_count);

#elif SI == 2

    static void ComputeCNNaiveStdMerge(const VertexID* larray, ui l_count, const VertexID* rarray,
                                       ui r_count, VertexID* cn, ui &cn_count);
    static void ComputeCNNaiveStdMerge(const VertexID* larray, ui l_count, const VertexID* rarray,
                                       ui r_count, ui &cn_count);

    static void ComputeCNGalloping(const VertexID * larray, ui l_count, const VertexID * rarray,
                                   ui r_count, VertexID * cn, ui& cn_count);
    static void ComputeCNGalloping(const VertexID * larray, ui l_count, const VertexID * rarray,
                                   ui r_count, ui& cn_count);
    static const ui GallopingSearch(const VertexID *src, ui begin, ui end, ui target);
    static const ui BinarySearch(const VertexID *src, ui begin, ui end, ui target);

#endif
};


#endif //FSE_COMPUTESETINTERSECTION_H

#include "worker.h"
// #include "systemI.h"
#include "setting.h"

#include <numeric>

using namespace std::chrono;

int Settings::maxNumNodes;

int main(int argc, char *argv[])
{   
    // launch a thread to record memory

    // char outputfilePeakMem[1000];
    // sprintf(outputfilePeakMem, "maxmem.txt");
    // ofstream foutPeakMem(outputfilePeakMem);
    // GetCurrentPid();
	// thread t = thread(info, GetCurrentPid(), ref(foutPeakMem));

    string fileName;
    int support, thread_num = 32;

    //load graph file
	char * argfilename = getCmdOption(argv, argv + argc, "-file");
	if(argfilename)
	{
		fileName = string(argfilename);
	}

    // get user-given support threshold
	char * argSupport = getCmdOption(argv, argv + argc, "-freq");
	if(argSupport)
	{
		support = atoi(argSupport);
	}

    // parameter to set the maximum subgraph size (in terms of the number of vertices)
	char * argMaxNodes = getCmdOption(argv, argv + argc, "-maxNodes");
	if(argMaxNodes)
	{
		Settings::maxNumNodes = atoi(argMaxNodes);
	}
	else
		Settings::maxNumNodes = -1;

    // get user-given number of threads
    char * argThreads = getCmdOption(argv, argv + argc, "-thread");
	if(argThreads)
	{
		thread_num = atoi(argThreads);
	}

    auto time1 = steady_clock::now();

    grami.nsupport_ = support;
    grami.pruned_graph.nsupport_ = support;
   
    Worker worker(thread_num);

    worker.load_data(support, argv[2]);

    auto time2 = steady_clock::now();

    worker.run();

    auto time3 = steady_clock::now();

    cout << "[TIME] Loading Graph Time: " << (float)duration_cast<milliseconds>(time2 - time1).count()/1000 << " s" << endl;

    cout << "[TIME] Mining Time: " << (float)duration_cast<milliseconds>(time3 - time2).count()/1000 << " s" << endl;

    cout << "[TIME] Total Elapsed Time: " << (float)duration_cast<milliseconds>(time3 - time1).count()/1000 << " s" << endl;

    cout << "[INFO] # Frequent Patterns: " << std::accumulate(results_counter.begin(), results_counter.end(), 0) << endl;

    // global_end_label_mem = false;
    // t.join();
	// foutPeakMem.close();

    return 0;
}

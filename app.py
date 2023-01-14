from flask import Flask, render_template, request, jsonify
import os
import subprocess

session = {}

app = Flask(__name__)
app.config['TEMPLATES_AUTO_RELOAD'] = True

@app.route("/")
def home():
    return render_template('tfsm.html')


@app.route("/gm") # gm: graph matching
def gm():
    return render_template('gmatch.html')

# get_neighbors !NOT USED!
@app.route("/get_neighbors", methods=['GET', 'POST'])
def get_neighbors():
    result = {}
    content = request.get_json()
    nodes = content["nodes"]
    dataset = content["dataset"]
    dataset_path = os.path.join("static", "data", dataset)
    print(dataset, nodes)
    # call c++ executable
    for node in nodes:
        # a.exe -n static\data\example\neighbor.txt -o static\data\example\offset.txt -t 1
        cmd = "a.exe -n " + os.path.join(dataset_path, "neighbor") + " -o " + os.path.join(dataset_path, "offset") + " -t " + str(node)
        # print(cmd)
        # .decode('ascii') convert byte to string
        neighbors = subprocess.check_output(cmd, shell=True).decode().strip()
        # print(neighbors)
        neighbors = neighbors.split(" ")
        # get neighbors larger than current node to avoid duplicates
        result[str(node)] = [int(n) for n in neighbors if int(n) > node]
    # print(jsonify(result))
    return jsonify(result)

@app.route("/get_graph/<request_data>", methods=['GET', 'POST'])
def get_graph(request_data):
    print("session:", session)
    data = request_data.split("|")
    dataset = data[0]
    nodes = data[1]
    user_id = data[2]
    graph_type = data[3]
    if get_session(user_id): # check if user_id already set in session dict
        print("dataset:", dataset, "nodes:", nodes)
        dataset_path = os.path.join("static", "data", dataset)
        # call c++ executable
        # a.exe -n static\data\example\neighbors -o static\data\example\offsets -p static\data\example\labels -u static\data\example\union_graph 7 8 9 10 11 12 13 
        graph_path = os.path.join(dataset_path, graph_type + "_" + user_id)
        # -e expansion_graph.graph
        if graph_type == "union_graph":
            cmd = "a.exe -n " + os.path.join(dataset_path, "neighbors") + " -o " + os.path.join(dataset_path, "offsets") +" -p " + os.path.join(dataset_path, "labels") +" -u " + graph_path + " " + nodes
        elif graph_type =="expansion_graph":
            cmd = "a.exe -n " + os.path.join(dataset_path, "neighbors") + " -o " + os.path.join(dataset_path, "offsets") +" -p " + os.path.join(dataset_path, "labels") +" -e " + graph_path + " " + nodes
        output = subprocess.check_output(cmd, shell=True).decode()
        print("output:", output)
        # os.system(cmd)
        # read the union graph file and return it as text
        contents = None
        with open(graph_path) as f:
            contents = f.read()
        return contents
    else:
        return "Invalid Session!!"

@app.route("/get_data_path/<dataset>", methods=['GET', 'POST'])
def get_data_path(dataset):
    print(os.path.join(request.url_root, "static", "data", dataset))
    return os.path.join(request.url_root, "static", "data", dataset)

@app.route("/get_datasets", methods=['GET'])
def get_datasets():
    result = {}
    print(os.listdir("static/data"))
    print()
    result["datasets"] = [name for name in os.listdir("static/data") if os.path.isdir(os.path.join(os.getcwd(),"static", "data", name))]
    print("datasets:", result)
    return result

@app.route("/set_session/<user_id>", methods=['GET', 'POST'])
def set_session(user_id):
    if user_id not in session:
        session[user_id] = ''
        return "The session has been set!"
    else:
        return "UserId already in session"

def get_session(user_id):
    # user_id is unique id generated for each user open the website
    if user_id in session:
        return True
    else:
        return False

@app.route("/mine/<request_data>", methods=['GET', 'POST'])
def mine(request_data):
    result = {}
    print(request_data)
    data = request_data.split("|")
    user_id = data[0]
    dataset = data[1]
    frequency = data[2]
    threads = data[3]
    if int(threads) > 32: threads = '32'
    support_type = data[4]
    max_nodes = data[5]
    # graph_type = data[3]
    if get_session(user_id): # check if user_id already set in session dict
        print("dataset:", dataset)
        dataset_path = os.path.join("static", "data", dataset, "data_graph")
        # ./run.exe -file ../../static/data/example/data_graph.graph -freq 5 -thread 4 -maxNodes 100
        if max_nodes:
            cmd = os.path.join("T-FSM", support_type, "run.exe") + " -file " + dataset_path + " -freq " + frequency + " -thread " + threads + " -maxNodes " + max_nodes
        else:
            cmd = os.path.join("T-FSM", support_type, "run.exe") + " -file " + dataset_path + " -freq " + frequency + " -thread " + threads
        print("cmd:", cmd)
        # try:
        patterns_path = os.path.join("static", "data", dataset, "patterns")
        # output = subprocess.check_output(cmd, shell=True).decode()
        os.system(cmd+" > " + patterns_path)
        # except:
            # return "Something went wrong when trying to execute the command!"
        # print("output:", output)

        # save output to disk to be used when search
        
        # with open(patterns_path, "w") as f:
        #     f.write(output)

        with open(patterns_path, 'r') as f:
            # parse the output
            # lines = f.readlines.split("\n")
            # print(lines)
            patterns = []
            for line in f.readlines():
                if line: # avoid last empty line
                    if line[0] == "t":
                        patterns.append(line.strip())
                    else:
                        # global_num_idle: 4 -> add to dict
                        l = line.split(":")
                        if "[TIME]" in l[0]:
                            key = l[0].split("[TIME]")[1]
                            result[key.strip()] = l[1].strip()
                        elif "[INFO]" in l[0]:
                            key = l[0].split("[INFO]")[1]
                            result[key.strip()] = l[1].strip()
                        else:
                            result[l[0].strip()] = l[1].strip()
                
        result["patterns"] = patterns
        # contents = None
        return result
    else:
        return "Invalid Session!!"

@app.route("/graph_match/<request_data>", methods=['GET', 'POST'])
def graph_match(request_data):
    print(request_data)
    data = request_data.split("|")
    user_id = data[0]
    dataset = data[1]
    max_result = data[2]
    query_graph = data[3]
    # graph_type = data[3]
    if get_session(user_id): # check if user_id already set in session dict
        print("dataset:", dataset)
        dataset_path = os.path.join("static", "data", dataset, "data_graph")
        # run.exe  100 ../static/data/example/data_graph t 3 3 v 0 0 2 v 1 1 2 v 2 2 2 e 0 1 e 0 2 e 1 2
        cmd = os.path.join("gmatch", "run.exe") + " " + max_result + " " + dataset_path + " " + query_graph
        print("cmd:", cmd)
        try:
            output = subprocess.check_output(cmd, shell=True).decode()
        except:
            return "Something went wrong when trying to execute the command!"
        print("output:", output)
        # contents = None
        return output
    else:
        return "Invalid Session!!"

@app.route("/get_labels/<request_data>", methods=['GET', 'POST'])
def get_labels(request_data):
    print(request_data)
    data = request_data.split("|")
    user_id = data[0]
    dataset = data[1]
    if get_session(user_id):
        path = os.path.join("static", "data", dataset, "true_labels")
        if not os.path.exists(path):
            return ""
        result = {}
        with open(path) as f:
            for line in f.readlines():
                contents = line.split(",")
                result[contents[0]] = contents[2].strip()
        print("result:", result)
        return result
    else:
        return "Invalid Session!!"

@app.route("/search/<request_data>", methods=['GET', 'POST'])
def search(request_data):
    print(request_data)
    data = request_data.split("|")
    user_id = data[0]
    dataset = data[1]
    min_node = data[2] if data[2] != "" else 0
    max_node = data[3] if data[3] != "" else 1000
    min_edge = data[4] if data[4] != "" else 0
    max_edge = data[5] if data[5] != "" else 1000
    min_label = data[6] if data[6] != "" else 0
    max_label = data[7] if data[7] != "" else 1000
    if get_session(user_id):
        patterns_path = os.path.join("static", "data", dataset, "patterns")
        if not os.path.exists(patterns_path):
            return "patterns file does not exist!"

        result = {}
        patterns = []
        with open(patterns_path) as f:
            contents = f.read()

        lst = contents.split('\n')
        print("lst:", lst)
        for line in lst:
            if line.startswith('t'):
                line_lst = line.split(' ')
                nodes = int(line_lst[1])
                edges = int(line_lst[2])

                label_set = set()
                for i in range(0, nodes):
                    label_set.add(line_lst[4*i+5])

                if nodes < int(min_node) or nodes > int(max_node) or \
                    edges < int(min_edge) or edges > int(max_edge) or \
                    len(label_set) < int(min_label) or len(label_set) > int(max_label):
                    continue
                # patterns += line + '\n'
                patterns.append(line.strip())
        
        result["patterns"] = patterns
        return result
    else:
        return "Invalid Session!!"

@app.route("/get_node2details/<request_data>", methods=['GET', 'POST'])
def get_node2details(request_data):
    print(request_data)
    data = request_data.split("|")
    user_id = data[0]
    dataset = data[1]
    if get_session(user_id):
        path = os.path.join("static", "data", dataset, "id_address_gps")
        if not os.path.exists(path):
            return "File does not exist!"
        result = {}
        with open(path) as f:
            for line in f.readlines():
                dic = {}
                # example: 1	Bed & Breakfast, The Barn House	(1.21336,52.91177)
                contents = line.split("\t")
                node_id = contents[0]
                dic["address"] = contents[1].strip()
                dic["lon_lat"] = contents[2].strip()
                result[node_id] = dic
        return result
    else:
        return "Invalid Session!!"

if __name__ == '__main__':
    # app.jinja_env.auto_reload = True
    app.run(debug=True, port=8000)
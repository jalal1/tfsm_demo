// var data_file =  window.location.search.substr(1); //'data/quasiclique.json';
// console.log("data_file:", data_file)
var linkStrength_factor = 1.0; // reduce it to spread out

//====================================
// Production
// website_URL = window.location.hostname
website_URL = "http://localhost:8000/"
console.log(website_URL)
    //====================================

//==================When open by T-FSM==================
function getQueryVariable(variable) {
    //https://css-tricks.com/snippets/javascript/get-url-variables/
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split("=");
        if (pair[0] == variable) { return pair[1]; }
    }
    return (false);
}

const queryString = window.location.search;
console.log("queryString:", decodeURIComponent(queryString));
const urlParams = new URLSearchParams(queryString);
var query_graph = getQueryVariable("query_graph")
    // replace + with space
query_graph = query_graph.split("+").join(" ");
console.log("query_graph:", query_graph)
var selected_dataset = getQueryVariable("selected_dataset")
var instances_max_result = getQueryVariable("instances_max_result")

//======================================================

// generate unique id for different users
const uid = () =>
    String(
        Date.now().toString(32) +
        Math.random().toString(16)
    ).replace(/\./g, '')

const USERID = uid();
console.log(USERID);

var dataset_path = undefined
var datasets = []

document.title = "Graph Matching";

// For MSIE < 9, forget it
function D3notok() {
    document.getElementById('sidepanel').style.visibility = 'hidden';
    var nocontent = document.getElementById('nocontent');
    nocontent.style.visibility = 'visible';
    nocontent.style.pointerEvents = 'all';
    var t = document.getElementsByTagName('body');
    var body = document.getElementsByTagName('body')[0];
}

var highlightInstances = undefined;

// Change status of a panel from visible to hidden or viceversa
var toggleDiv = undefined;

// Highlight a node in the graph. It is a closure within the d3.json() call.
var selectNode = undefined;

// map label id to true label name
var id2label = {}
var node2details = {}

// Do the stuff -- to be called after D3.js has loaded
function D3ok() {

    DEBUG = true;

    // set session
    d3.text(website_URL + "/set_session/" + USERID, function(response) {
        console.log(response)
    });

    // In debug mode, ensure there is a console object (MSIE does not have it by 
    // default). In non-debug mode, ensure the console log does nothing
    if (!window.console || !DEBUG) {
        window.console = {};
        window.console.log = function() {};
    }

    // Some constants
    var WIDTH = document.getElementById('networkPanel').clientWidth, //window.innerWidth,
        HEIGHT = document.getElementById('networkPanel').clientHeight, //window.innerHeight,
        SHOW_THRESHOLD = 2.5;

    var QG_WIDTH = document.getElementById('queryGraph').clientWidth,
        QG_HEIGHT = document.getElementById('queryGraph').clientHeight

    // console.log("Width:", WIDTH)
    // Variables keeping graph state
    var activeNode = undefined;
    var activeInstance = undefined;
    var currentOffset = { x: 0, y: 0 };
    var QGcurrentOffset = { x: 0, y: 0 };
    var currentTranslate = [0, 0];
    var QGcurrentTranslate = [0, 0];

    var selected_graph_type; // get its value from the radio button

    // The D3.js scales
    var xScale = d3.scale.linear()
        .domain([0, WIDTH])
        .range([0, WIDTH]);
    var yScale = d3.scale.linear()
        .domain([0, HEIGHT])
        .range([0, HEIGHT]);
    var zoomScale = d3.scale.linear()
        .domain([1, 20])
        .range([1, 20])
        .clamp(true);

    var QGxScale = d3.scale.linear()
        .domain([0, QG_WIDTH])
        .range([0, QG_WIDTH]);
    var QGyScale = d3.scale.linear()
        .domain([0, QG_HEIGHT])
        .range([0, QG_HEIGHT]);
    var QGzoomScale = d3.scale.linear()
        .domain([1, 6])
        .range([1, 6])
        .clamp(true);

    // populate dataset combobox
    /* .......................................................................... */
    /* ....................................................................... */
    // A number of forward declarations. These variables need to be defined since 
    // they are attached to static code in HTML. But we cannot define them yet
    // since they need D3.js stuff. So we put placeholders.

    // colors
    var colors = ["#3597c5", "#fb5427", "#25a40d", "#f027fc", "#a28b5c", "#cf6dac", "#7f80fb", "#26a175", "#c0811e", "#e2685f", "#749a3d", "#ce60e1", "#aa8491", "#f941ad", "#8e87c6", "#719590", "#ec5993", "#d27642", "#818eab", "#939318", "#119daa", "#4591e0", "#c87878", "#e649e1", "#6b9a5b", "#519f3c", "#a78b40", "#b9825d", "#ab8b1b", "#f2577a", "#d76b92", "#7f9476", "#908d91", "#aa7cc6", "#9e85ab", "#be63fc", "#b571e1", "#d57521", "#bd8141", "#508bfb", "#e45bad", "#f95546", "#fc1ce2", "#d84dfc", "#599f11", "#f65660", "#b28377", "#5e9b76", "#89935b", "#5c96ab", "#799914", "#489c90", "#8f933e", "#42a05a", "#9a8c77", "#e86724", "#997ee0", "#c46fc6", "#c17992", "#f145c7", "#dd6a79", "#6b90c5", "#e66844", "#7689e0", "#db5dc7", "#ce775e", "#a274fb", "#b77aac"]

    // move to specific node without highligiting. It is a closure within the d3.json() call.
    var moveToNode = undefined;

    var labels_set = new Set();

    // Clear all help boxes and select a movie in network and in movie details panel
    // var clearAndSelect = undefined;


    // The call to set a zoom value -- currently unused
    // (zoom is set via standard mouse-based zooming)
    var zoomCall = undefined;

    // selected instance and highlightInstances(...) should be Global for highlightInstances() to work!
    var instances_list = [];

    // Get the current size & offset of the browser's viewport window
    function getViewportSize(w) {
        var w = w || window;
        console.log(w);
        if (w.innerWidth != null)
            return {
                w: w.innerWidth,
                h: w.innerHeight,
                x: w.pageXOffset,
                y: w.pageYOffset
            };
        var d = w.document;
        if (document.compatMode == "CSS1Compat")
            return {
                w: d.documentElement.clientWidth,
                h: d.documentElement.clientHeight,
                x: d.documentElement.scrollLeft,
                y: d.documentElement.scrollTop
            };
        else
            return {
                w: d.body.clientWidth,
                h: d.body.clientHeight,
                x: d.body.scrollLeft,
                y: d.body.scrollTop
            };
    }

    function getQStringParameterByName(name) {
        var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
        return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
    }
    /* Change status of a panel from visible to hidden or viceversa
       id: identifier of the div to change
       status: 'on' or 'off'. If not specified, the panel will toggle status
    */
    toggleDiv = function(id, status) {
            d = d3.select('div#' + id);
            console.log('TOGGLE', id, d.attr('class'), '->', status);
            if (status === undefined)
                status = d.attr('class') == 'panel_on' ? 'off' : 'on';
            d.attr('class', 'panel_' + status);
            return false;
        }
        /* Clear all help boxes and select a movie in the network and in the 
           movie details panel
        */
        // clearAndSelect = function (id) {
        //   selectNode(id,true);	// we use here the selectNode() closure
        // }
        /* Compose the content for the panel with movie details.
           Parameters: the node data, and the array containing all nodes
        */
    function getNodeInfo(n, nodeArray) {
        console.log("INFO", n);
        info = '<div id="cover">';
        info += '<br/><br/>'
            // info += '<div class=t style="float: right"><span class=lbig>Label Id:</span>&nbsp;&nbsp;' + n.label + '</div>';
        if (id2label) {
            info += '<div class=t style="float: left"><span class=lbig>Node Id:</span>&nbsp;&nbsp;' + n.id + '</div>';
            info += '<div class=t style="float: left"><span class=lbig>Label Name:</span>&nbsp;&nbsp;' + id2label[n.label] + '</div>';
            info += '<div class=t style="float: left"><span class=lbig>Address:</span>&nbsp;&nbsp;' + node2details[n.id]["address"] + '</div>';
            info += '<div class=t style="float: left"><span class=lbig>Coordinates:</span>&nbsp;&nbsp;' + node2details[n.id]["lon_lat"] + '</div>';
        }
        info +=
            '<img src="static/img/close.png" class="action" style="left:5px; top: 5px;" title="close panel" onClick="toggleDiv(\'nodeInfo\');"/>' +
            '<img src="static/img/target-32.png" class="action" style="left:50px; top: -2px" title="center graph on node" onclick="selectNode(' + n.index + ',true);"/>';

        info += '<br/></div><div style="clear: both;">'
        info += '<div class=f><span class=l>Node ID</span>: <span class=g>' +
            n.id + '</span></div>';
        if (n.content) info += '<div class=f><span class=l>Content</span>: <br><span class=g>' +
            n.content + '</span></div>';
        if (n.links.length > 0) {
            info += '<div class=f><span class=l>Related to</span>: <br>';
            n.links.forEach(function(idx) {
                info += '[<a href="javascript:void(0);" onclick="selectNode(' +
                    idx + ',true);">' + nodeArray[idx].id + '</a>] '
            });
            info += '</div>';
        }
        return info;
    }
    // *************************************************************************
    function fill_datasets(options) {
        var select = document.getElementById("datasets_combobox");

        for (var i = 0; i < options.length; i++) {
            var opt = options[i];
            var el = document.createElement("option");
            el.textContent = opt;
            el.value = opt;
            select.appendChild(el);
        }
        // fire this event when change/choose the dataset
        $('#datasets_combobox').on('change', function(e) {
            // var optionSelected = $("option:selected", this);
            selected_dataset = this.value;
            console.log("selected dataset:", selected_dataset)
            if (this.value != "Choose a Dataset") { // skip first option
                // draw everything
                run();
            }

        });

    }

    function get_graph_type() {
        // get checked/default value
        selected_graph_type = document.querySelector('input[name="graph_type"]:checked').value;
        // on change event
        $('input[type=radio][name=graph_type]').change(function() {
            if (this.value == 'union_graph') {
                console.log(this.value)
                selected_graph_type = this.value;
            } else if (this.value == 'expansion_graph') {
                console.log(this.value)
                selected_graph_type = this.value;
            }
            if (selected_dataset != undefined)
                run()
        });

    }

    function get_node_details() {
        request_data = USERID + "|" + selected_dataset
        d3.json(website_URL + "/get_node2details/" + request_data, function(response) {
            if (response) {
                node2details = response
                // console.log("node2details:", node2details)
            } else {
                console.log("!!! Something wrong !!!")
            }

        });
    }

    // get all datasets first
    d3.json(website_URL + "/get_datasets", function(response) {
        console.log("datasets:", response)
        fill_datasets(response["datasets"])
            // fill data set using selected_dataset from T-FSM (first page)
        var options = document.getElementById('datasets_combobox').options;
        for (var i = 0, n = options.length; i < n; i++) {
            if (options[i].value == selected_dataset) {
                var element = document.getElementById("datasets_combobox")
                element.selectedIndex = i;
                var event = new Event('change');
                element.dispatchEvent(event);
                // element.disabled = true;
                break;
            }
        }
    });

    get_graph_type();

    // const start = Date.now();
    get_node_details(); // large file ~ 10 mb
    // const end = Date.now();
    // console.log(`Execution time: ${end - start} ms`);


    var svg = undefined


    function run() {
        // clear current elements
        d3.selectAll('svg').remove();
        // The D3.js force-directed layout
        // The D3.js force-directed layout: query graph
        var QGforce = d3.layout.force();

        // Query graph svg
        var queryGraph_svg = d3.select("#queryGraph").append("svg")
            .attr('xmlns', 'http://www.w3.org/2000/svg')
            .attr("width", QG_WIDTH)
            .attr("height", QG_HEIGHT)
            .attr("id", "queryGraph")
            .attr("viewBox", "0 0 " + (QG_WIDTH - 50) + " " + (QG_HEIGHT - 50)) //J: increse viewBox, so entire graph looks smaller
            .attr("preserveAspectRatio", "xMidYMid meet");

        // Movie panel: the div into which the movie details info will be written
        nodeInfoDiv = d3.select("#nodeInfo");
        // data graph
        var nodeArray = undefined;
        var linkArray = undefined;
        // query graph nodes and links
        var QGnodeArray = undefined;
        var QGlinkArray = undefined;
        // union graph nodes and links
        var UGnodeArray = [];
        var UGlinkArray = [];

        var nodes_map = {};

        var colorNode = undefined;
        var query_graph_map = [
            []
        ];

        var currentZoom = 6;
        var QGcurrentZoom = 5;
        var zoom_step = 0.5;

        function parse_graph(graph) {
            nodeArray = []
            linkArray = []
            nodes_map = {}
            node2links = {} // to save links on the node level
            nodes_counter = 0;
            console.log("graph:", graph)
            var dsv = d3.dsv(" ", "text/plain");
            dsv.parseRows(graph, function(d) {
                // remove empty spaces
                var f = d.filter(el => {
                    return el != null && el != '';
                });
                // console.log(f)
                // get labels
                if (f[0] == 'v') {
                    // v = {index:Number(f[1]), id:Number(f[1]), label:f[2], score:7, level:2};
                    v = { index: nodes_counter, id: Number(f[1]), label: f[2], score: 7, level: 2 };
                    // console.log("v:", v)
                    nodeArray.push(v)

                    nodes_map[Number(f[1])] = nodes_counter;
                    nodes_counter += 1;
                }
                // get links
                else if (f[0] == 'e') {
                    // add links
                    e = { source: nodes_map[Number(f[1])], target: nodes_map[Number(f[2])], weight: 1 }
                        // e = {source:nodes_map[Number(f[1])], target:nodes_map[Number(f[2])], weight:1}
                    linkArray.push(e)
                        // example: add link 0->2
                        // 1. add 2 to the links of 0
                    if (nodes_map[Number(f[1])] in node2links) {
                        node2links[nodes_map[Number(f[1])]].push(Number(nodes_map[Number(f[2])]))
                    } else {
                        node2links[nodes_map[Number(f[1])]] = []
                        node2links[nodes_map[Number(f[1])]].push(Number(nodes_map[Number(f[2])]))
                    }
                    // 2. add 0 to the links of 2
                    if (nodes_map[Number(f[2])] in node2links) {
                        node2links[nodes_map[Number(f[2])]].push(Number(nodes_map[Number(f[1])]))
                    } else {
                        node2links[nodes_map[Number(f[2])]] = []
                        node2links[nodes_map[Number(f[2])]].push(Number(nodes_map[Number(f[1])]))
                    }
                }
            });

            //update each node links
            console.log("node2links:", node2links)
            nodeArray.forEach(function(n) {
                n["links"] = node2links[nodes_map[n.id]]
            });

            return [nodeArray, linkArray]
        }

        function preprocess_pattern(graph_string) {
            // nodes example: t 10 9 v 0 0 2 v 1 0 2 v 2 1 2 v 3 1 2 v 4 0 2 v 5 0 2 v 6 1 2 v 7 1 1 v 8 1 2 v 9 1 1 e 0 1 e 1 2 e 2 3 e 3 4 e 4 5 e 5 6 e 6 7 e 0 8 e 8 9
            result = ""
            graph = graph_string.split(" ");
            // console.log(graph)
            graph.forEach(function(c, index) {
                // console.log(index, c)
                if (graph[index] == "t") {
                    result += graph[index] + " " + graph[index + 1] + " " + graph[index + 2] + "\n";
                } else if (graph[index] == "v") {
                    result += graph[index] + " " + graph[index + 1] + " " + graph[index + 2] + " " + graph[index + 3] + "\n";
                } else if (graph[index] == "e") {
                    result += graph[index] + " " + graph[index + 1] + " " + graph[index + 2] + "\n";
                }

            })

            return result
        }
        // get graph from URL string

        // get true labels
        request_data = USERID + "|" + selected_dataset
        // document.getElementById("loader").style.visibility = "visible";
        d3.json(website_URL + "/get_labels/" + request_data, function(response) {
            // document.getElementById("loader").style.visibility = "hidden";
            // console.log(response)
            id2label = response
            // console.log("id2label:", id2label)


            graph = preprocess_pattern(query_graph)
            console.log("query_graph:", query_graph)

            result = parse_graph(graph)
            QGnodeArray = result[0];
            QGlinkArray = result[1];

            console.log("QGnodeArray", QGnodeArray)
            console.log("QGlinkArray", QGlinkArray)

            // fill labels_set
            labels_set = new Set();
            QGnodeArray.forEach(function(node) {
                    labels_set.add(node.label)
                })
                // get query_graph_map
            QGlinkArray.forEach(function(link) {
                if (typeof query_graph_map[link.source] === 'undefined') {
                    // does not exist
                    query_graph_map[link.source] = [];
                }
                query_graph_map[link.source].push(link.target);
            })
            console.log("labels_set:", labels_set)
            console.log("query_graph_map:", query_graph_map)

            // labels colors
            colorNode = d3.scale.ordinal().domain(labels_set)
                // .range(["green", "blue"])
                .range(colors.slice(0, labels_set.size))

            QGminLinkWeight =
                Math.min.apply(null, QGlinkArray.map(function(n) { return n.weight; }));
            QGmaxLinkWeight =
                Math.max.apply(null, QGlinkArray.map(function(n) { return n.weight; }));
            console.log("link weight = [" + QGminLinkWeight + "," + QGmaxLinkWeight + "]");

            QGforce
                .nodes(QGnodeArray)
                .links(QGlinkArray)
                .start();

            // A couple of scales for node radius & edge width
            var QGnode_size = d3.scale.linear()
                .domain([5, 10]) // we know score is in this domain
                .range([1, 16])
                .clamp(true);
            var QGedge_width = d3.scale.pow().exponent(8)
                .domain([QGminLinkWeight, QGmaxLinkWeight])
                .range([1, 3])
                .clamp(true);

            /* Add drag & zoom behaviours */
            queryGraph_svg.call(d3.behavior.drag()
                .on("drag", QGdragmove));
            queryGraph_svg.call(d3.behavior.zoom()
                .x(QGxScale)
                .y(QGyScale)
                // .scaleExtent([1, 100])
                .on("zoom", QGdoZoom));

            var queryGraph = queryGraph_svg.append('svg:g').attr('class', 'grpParentQG');

            // links: simple lines
            console.log("QGlinkArray:", QGlinkArray)
            var QGgraphLinks = queryGraph.append('svg:g').attr('class', 'grp gLinksQG')
                .selectAll("line")
                .data(QGlinkArray, function(d) { return d.source.id + '-' + d.target.id; })
                .enter().append("line")
                .style('stroke-width', function(d) { return QGedge_width(d.weight); })
                .attr("class", "link")
                .attr('id', function(d) { return "QGlink" + d.source.index + '-' + d.target.index; })

            // nodes: an SVG circle
            var QGgraphNodes = queryGraph.append('svg:g').attr('class', 'grp gNodesQG')
                .selectAll("circle")
                .data(QGnodeArray, function(d) { return d.id; })
                .enter().append("svg:circle")
                .attr('id', function(d) { return "QGc" + d.index; })
                // .attr('class', function(d) { return 'node level'+d.level;} )
                .attr('r', function(d) { return QGnode_size(d.score || 3); })
                .attr('pointer-events', 'all')
                .attr("fill", function(d) { return colorNode(d.label); }) // change colors for query graph and instances, not the data graph

            // labels: a group with two SVG text: a title and a shadow (as background)
            var QGgraphLabels = queryGraph.append('svg:g').attr('class', 'grp gLabel')
                .selectAll("g.label")
                // .data( QGnodeArray, function(d){return d.label} ) // J: d.label: return unique labels only!
                .data(QGnodeArray)
                .enter().append("svg:g")
                .attr('id', function(d) { return "QGl" + d.index; })
                .attr('class', 'label');

            // QGshadows = QGgraphLabels.append('svg:text')
            // .attr('x','-2em')
            // .attr('y','-.3em')
            // .attr('pointer-events', 'none') // they go to the circle beneath
            // .attr('id', function(d) { return "QGlb" + d.index; } )
            // .attr('class','nshadow')
            // .text( function(d) { return d.label; } );

            QGlabels = QGgraphLabels.append('svg:text')
                .attr('x', '-2em')
                .attr('y', '-1em') // minus values moves it up
                .attr('pointer-events', 'none') // they go to the circle beneath
                .attr('id', function(d) { return "QGlf" + d.index; })
                .attr('class', 'QGnlabel')
                // .text(function(d) { return d.id + ": " + d.label; }); //J: show index for now instead of "d.label"
                // .text( function(d) { return d.label; } );
                .text(function(d) {
                    if (id2label) { // check if id2lable is not empty
                        return d.id + ": " + id2label[d.label];
                    } else {
                        return d.id
                    }

                });

            function repositionQueryGraph(off, z, mode) {
                // console.log( "REPOS: off="+off, "zoom="+z, "mode="+mode );

                // do we want to do a transition?
                var doTr = (mode == 'move');

                // drag: translate to new offset
                if (off !== undefined &&
                    (off.x != QGcurrentOffset.x || off.y != QGcurrentOffset.y)) {
                    g = d3.select('g.grpParentQG')
                    if (doTr)
                        g = g.transition().duration(500);
                    g.attr("transform", function(d) {
                        return "translate(" +
                            off.x + "," + off.y + ")"
                    });
                    QGcurrentOffset.x = off.x;
                    QGcurrentOffset.y = off.y;
                }

                // zoom: get new value of zoom
                if (z === undefined) {
                    if (mode != 'tick')
                        return; // no zoom, no tick, we don't need to go further
                    z = QGcurrentZoom;
                } else
                    QGcurrentZoom = z;

                // move edges
                e = doTr ? QGgraphLinks.transition().duration(500) : QGgraphLinks;
                e
                    .attr("x1", function(d) { return z * (d.source.x); })
                    .attr("y1", function(d) { return z * (d.source.y); })
                    .attr("x2", function(d) { return z * (d.target.x); })
                    .attr("y2", function(d) { return z * (d.target.y); });

                // move nodes
                n = doTr ? QGgraphNodes.transition().duration(500) : QGgraphNodes;
                n
                    .attr("transform", function(d) {
                        return "translate(" +
                            z * d.x + "," + z * d.y + ")"
                    });
                // move labels
                l = doTr ? QGgraphLabels.transition().duration(500) : QGgraphLabels;
                l
                    .attr("transform", function(d) {
                        return "translate(" +
                            z * d.x + "," + z * d.y + ")"
                    });
            }

            function QGdragmove(d) {
                // console.log("DRAG",d3.event);
                offset = {
                    x: QGcurrentOffset.x + d3.event.dx,
                    y: QGcurrentOffset.y + d3.event.dy
                };
                repositionQueryGraph(offset, undefined, 'drag');
            }

            function QGdoZoom(increment) {
                if (!d3.event.sourceEvent.deltaY) return;

                if (d3.event.translate[0] > QGcurrentTranslate[0]) {
                    console.log("Zoom out...")
                    newZoom = zoomScale(QGcurrentZoom - zoom_step) //d3.event.scale
                    QGcurrentTranslate = d3.event.translate
                }
                // zoom in
                else {
                    console.log("Zoom in...")
                    newZoom = zoomScale(QGcurrentZoom + zoom_step)
                    QGcurrentTranslate = d3.event.translate
                }
                console.log("ZOOM", QGcurrentZoom, "->", newZoom, increment);

                console.log("QG ZOOM", QGcurrentZoom, "->", newZoom, increment);
                if (QGcurrentZoom == newZoom)
                    return; // no zoom change

                // See if we cross the 'show' threshold in either direction
                if (QGcurrentZoom < SHOW_THRESHOLD && newZoom >= SHOW_THRESHOLD)
                    svg.selectAll("g.label").classed('on', true);
                else if (QGcurrentZoom >= SHOW_THRESHOLD && newZoom < SHOW_THRESHOLD)
                    svg.selectAll("g.label").classed('on', false);

                // See what is the current graph window size
                s = getViewportSize(); // !!! check how to get GQ window size
                width = s.w < QG_WIDTH ? s.w : QG_WIDTH;
                height = s.h < QG_HEIGHT ? s.h : QG_HEIGHT;

                // Compute the new offset, so that the graph center does not move
                zoomRatio = newZoom / QGcurrentZoom;
                newOffset = {
                    x: QGcurrentOffset.x * zoomRatio + width / 2 * (1 - zoomRatio),
                    y: QGcurrentOffset.y * zoomRatio + height / 2 * (1 - zoomRatio)
                };
                console.log("offset", QGcurrentOffset, "->", newOffset);

                // Reposition the graph
                repositionQueryGraph(newOffset, newZoom, "zoom");
            }
            // center QG graph in the center: get QG g element width and height and then substract from QG_WIDTH/2 and QG_HEIGHT/2
            // QG_g_width = d3.select('.grpParentQG').node().getBoundingClientRect().width
            // QG_g_height = d3.select('.grpParentQG').node().getBoundingClientRect().height
            // console.log("g_width:",QG_g_width, "QG_g_height:", QG_g_height)
            // console.log("QG_WIDTH/2 - QG_g_width:",QG_WIDTH/2 - QG_g_width, "QG_HEIGHT/2 - QG_g_height:", QG_HEIGHT/2 - QG_g_height)
            QGforce
            // .size( [QG_WIDTH/2 - QG_g_width, QG_HEIGHT/2 - QG_g_height] ) // used to center the QG svg
                .size([QG_WIDTH / QGcurrentZoom, QG_HEIGHT / QGcurrentZoom])
                // .linkStrength(0);

            // for query graph
            QGforce.on("tick", function() {
                repositionQueryGraph(undefined, undefined, 'tick');
            });



            // 3. LOAD INSTANCES
            request_data = USERID + "|" + selected_dataset + "|" + instances_max_result + "|" + query_graph
            console.log("request_data:", request_data)

            document.getElementById("loader").style.visibility = "visible";
            d3.text(website_URL + "/graph_match/" + request_data, function(text) {
                document.getElementById("loader").style.visibility = "hidden";
                // console.log("text:", text);
                // constructs a new parser special delimiter
                var dsv = d3.dsv(" ", "text/plain");
                var data = dsv.parseRows(text, function(d) {
                    // console.log(d)
                    // remove empty spaces
                    var f = d.filter(el => {
                        return el != null && el != '';
                    });
                    // console.log(f)
                    return f.map(Number);
                });
                // console.log(data);
                console.log("instances:", data)
                show_instances(data);
            });

            // test data for pagination
            // data_source = [...Array(100).keys()];
            // highlight instances
            var highlighted_instance_nodes = [];
            var highlighted_instance_links = [];

            highlightInstances = function(el, index, on) {
                console.log("el:", el, "index:", index)
                    // 1. reset highlighted instances
                if (highlighted_instance_nodes != undefined) {
                    highlighted_instance_nodes.forEach(function(node_index) {
                        circle = d3.select('#c' + node_index);
                        circle.classed('highlight', false);
                    });
                    highlighted_instance_nodes = []
                }
                if (highlighted_instance_links != undefined) {
                    console.log("highlighted_instance_links:", highlighted_instance_links)
                    highlighted_instance_links.forEach(function(l) {
                        link = d3.select(l);
                        console.log("link:", link)
                        link.classed('highlighted', false);
                        link.style('stroke-width', 1)
                    });
                    highlighted_instance_links = []
                }

                // index: this is the instance index using the pagination order.
                console.log("index=", index);
                // default value for 'on', when 'on' is missing
                if (on === undefined) {
                    on = true;
                }
                nodes = instances_list[index]; // data graph node ids
                console.log(nodes)
                    // zoom to the first nodes in the instances
                    // moveToNode(nodes_map[nodes[0]], WIDTH, HEIGHT);

                // 2. highlight nodes

                // !! NOT USED !! 
                // get node index using node id. node id is the data graph id.
                vis_nodes = [] // array containg node indices used for visualization.
                nodes.forEach(function(node_id) {
                    vis_nodes.push(nodes_map[node_id])
                })
                console.log("vis_nodes:", vis_nodes)

                vis_nodes.forEach(function(node_index, index) { // index: like counter, 0, 1, ...
                    console.log("node_index:", node_index)
                    circle = d3.select('#c' + node_index);
                    console.log("circle:", circle);
                    // console.log("on:", on, "index:", index);
                    circle.classed('highlight', on);

                    // use query_graph_map to highlight links
                    console.log(query_graph_map, index)
                    if (typeof query_graph_map[index] === 'undefined') {
                        return; // can't use continue with forEach, so return should be used.
                    }
                    target_indices = query_graph_map[index];
                    console.log("node_index:", node_index, "target_indices:", target_indices)
                        // UGnodeArray[node_index].links.forEach(function (target_node) {
                    target_indices.forEach(function(target_index) { // !!!
                        // console.log("#link" + Number(node_index)+'-'+Number(target_node));
                        link = d3.select("#link" + node_index + '-' + vis_nodes[target_index]);
                        if (link[0][0] === null) {
                            link = d3.select("#link" + vis_nodes[target_index] + '-' + node_index);
                        }
                        highlighted_instance_links.push(link[0][0])
                        console.log("added link:", link)
                        link.classed('highlighted', on);
                        link.style('stroke-width', 3)

                    })

                });
                highlighted_instance_nodes = vis_nodes;
                // set the value for the current active instance
                // activeInstance = on ? index : undefined;

                // highligh the selected instance
                // find all the elements in your channel list and loop over them
                Array.prototype.slice.call(document.querySelectorAll('div[data-tag="instanceList"] a')).forEach(function(element) {
                    // remove the selected class
                    element.classList.remove('active');
                });
                // add the selected class to the element that was clicked
                el.classList.add('active');
            }

            function show_instances(data) {
                // 1. show pagination area
                // 2. group unique nodes from instances
                // 3. get the union graph
                var container = $('#pagination-container');
                container.pagination({
                    dataSource: data,
                    pageSize: 5,
                    showSizeChanger: true,
                    pageRange: 1,
                    // hideFirstOnEllipsisShow: true,
                    // hideLastOnEllipsisShow: true,
                    // showPageNumbers: false,
                    className: 'paginationjs-small',
                    sizeChangerOptions: [10, 20],
                    // get page instances (2d array), then get unique nodes
                    // formatResult: "Formats the data items of current page before callback invoked."
                    formatResult: function(data) {
                        unique_nodes = new Set();
                        // get unique nodes from instances
                        data.forEach(function(instance_nodes) {
                                instance_nodes.forEach(function(node) {
                                    unique_nodes.add(node)
                                })
                            })
                            // for (var i = 0, len = data.length; i < len; i++) {
                            //   current_page_nodes.push(data[i]);
                            // }
                        console.log("unique_nodes:", unique_nodes)
                            // clear svg first
                        if (svg != undefined) {
                            console.log("svg:", svg)
                                // svg.selectAll("*").remove();
                            d3.select("#networkPanel").select("svg").remove();
                        }
                        plot_graph(unique_nodes, selected_graph_type);
                        return unique_nodes;

                    },
                    callback: function(data, pagination) {
                        // template method of yourself
                        var html = template(data);
                        $('#instances-container').html(html);
                    },
                    //   afterRender: function(){
                    //     console.log("afterRender")
                    //     // console.log("current_page_nodes:", current_page_nodes)
                    //     // create union graph
                    // }
                });

                // call flask server using XMLHttpRequest
                function plot_graph(unique_nodes, selected_graph_type) {
                    // reset currentOffset
                    currentOffset = currentOffset = { x: 0, y: 0 };

                    unique_nodes_string = Array.from(unique_nodes).join(" ")
                    request_data = selected_dataset + "|" + unique_nodes_string + "|" + USERID + "|" + selected_graph_type
                    console.log(request_data)
                        // https://github.com/d3/d3-request
                    d3.text(website_URL + "/get_graph/" + request_data, function(graph) {
                        // d3.text("static/data/example/union_graph", function(graph) {
                        result = parse_graph(graph)
                        UGnodeArray = result[0];
                        UGlinkArray = result[1];
                        // });
                        //------
                        console.log("UGnodeArray", UGnodeArray)
                        console.log("UGlinkArray", UGlinkArray)

                        // minLinkWeight = 
                        //   Math.min.apply( null, UGlinkArray.map( function(n) {return n.weight;} ) );
                        // maxLinkWeight = 
                        //   Math.max.apply( null, UGlinkArray.map( function(n) {return n.weight;} ) );
                        // console.log( "link weight = ["+minLinkWeight+","+maxLinkWeight+"]" );
                        var force_size = d3.scale.linear()
                            .domain([1, 100]) // we know score is in this domain
                            .range([1, 15])
                            .clamp(true);

                        var force = d3.layout.force()
                            // .charge(-1)
                            // .gravity(0.5) //J: better than keep moving.
                            .size([WIDTH / currentZoom, HEIGHT / currentZoom]) // use this to center the graph
                            // .size([WIDTH / force_size(UGnodeArray.length), HEIGHT / force_size(UGnodeArray.length)])
                            .linkStrength(function(d, idx) { console.log("linkStrength:", d.weight * linkStrength_factor); return d.weight * linkStrength_factor; });

                        console.log("force size:", [WIDTH / currentZoom, HEIGHT / currentZoom])
                            // console.log("force size:", [WIDTH / force_size(UGnodeArray.length), HEIGHT / force_size(UGnodeArray.length)])


                        force
                            .nodes(UGnodeArray)
                            .links(UGlinkArray)
                            .start();

                        // A couple of scales for node radius & edge width
                        var node_size = d3.scale.linear()
                            .domain([5, 10]) // we know score is in this domain
                            .range([1, 16])
                            .clamp(true); // to force the range min/max; not to go less or more than the range: https://www.d3indepth.com/scales/

                        // Add to the page the SVG element that will contain the graph
                        svg = d3.select("#networkPanel").append("svg")
                            .attr('xmlns', 'http://www.w3.org/2000/svg')
                            .attr("width", WIDTH)
                            .attr("height", HEIGHT - 50) // network panel bottom border is cut. This is a quick fix. Later find the exact reason!!
                            .attr("id", "graph")
                            .attr("viewBox", "0 0 " + (WIDTH) + " " + (HEIGHT)) //J: increse viewBox, so entire graph looks smaller
                            .attr("preserveAspectRatio", "xMidYMid meet");

                        /* Add drag & zoom behaviours */
                        svg.call(d3.behavior.drag()
                            .on("drag", dragmove));
                        svg.call(d3.behavior.zoom()
                            // .x(xScale)
                            // .y(yScale)
                            // .scaleExtent([1, 100])
                            .on("zoom", doZoom));

                        var networkGraph = svg.append('svg:g').attr('class', 'grpParent');

                        // links: simple lines
                        var graphLinks = networkGraph.append('svg:g').attr('class', 'grp gLinks')
                            .selectAll("line")
                            .data(UGlinkArray, function(d) { return d.source.id + '-' + d.target.id; })
                            .enter().append("line")
                            .style('stroke-width', 2) //function(d) { return edge_width(d.weight);} )
                            .attr("class", "link")
                            .attr('id', function(d) { return "link" + d.source.index + '-' + d.target.index; })

                        // nodes: an SVG circle
                        var graphNodes = networkGraph.append('svg:g').attr('class', 'grp gNodes')
                            .selectAll("circle")
                            .data(UGnodeArray, function(d) { return d.id; })
                            .enter().append("svg:circle")
                            .attr('id', function(d) { return "c" + d.index; })
                            .attr('class', function(d) { return 'node level' + d.level; })
                            .attr('r', function(d) { return node_size(d.score || 3); })
                            .attr('pointer-events', 'all')
                            .attr("fill", function(d) { return colorNode(d.label); }) // use label id to color the node
                            .on("click", function(d) { showMoviePanel(d); })
                            // .on("mouseover", function(d) { highlightGraphNode(d, true, this); })
                            // .on("mouseout", function(d) { highlightGraphNode(d, false, this); })

                        // labels: a group with two SVG text: a title and a shadow (as background)
                        var graphLabels = networkGraph.append('svg:g').attr('class', 'grp gLabel')
                            .selectAll("g.label")
                            .data(UGnodeArray, function(d) { return d.id })
                            .enter().append("svg:g")
                            .attr('id', function(d) { return "l" + d.index; })
                            .attr('class', 'label');

                        // shadows = graphLabels.append('svg:text')
                        //   .attr('x','-2em')
                        //   .attr('y','-.3em')
                        //   .attr('pointer-events', 'none') // they go to the circle beneath
                        //   .attr('id', function(d) { return "lb" + d.index; } )
                        //   .attr('class','nshadow')
                        //   .text( function(d) { return d.label; } );

                        labels = graphLabels.append('svg:text')
                            .attr('x', '-2em')
                            .attr('y', '-1em')
                            .attr('pointer-events', 'none') // they go to the circle beneath
                            .attr('id', function(d) { return "lf" + d.index; })
                            .attr('class', 'nlabel')
                            .text(function(d) { return d.id; });

                        function highlightGraphNode(node, on) {
                            //J: !!! Change this method later to get neighbors from server !!!

                            //if( d3.event.shiftKey ) on = false; // for debugging

                            // If we are to activate a movie, and there's already one active,
                            // first switch that one off
                            if (on && activeNode !== undefined) {
                                console.log("..clear: ", activeNode);
                                highlightGraphNode(UGnodeArray[activeNode], false);
                                console.log("..cleared: ", activeNode);
                            }

                            // console.log("SHOWNODE "+node.index+" ["+node.label + "]: " + on);
                            // console.log(" ..object ["+node + "]: " + on);
                            // locate the SVG nodes: circle & label group
                            circle = d3.select('#c' + node.index);
                            label = d3.select('#l' + node.index);
                            // console.log(" ..DOM: ",label);

                            // activate/deactivate the node itself
                            //J: error in debug, comment for now
                            // console.log(" ..box CLASS BEFORE:", label.attr("class"));
                            // console.log("circle:", circle);
                            // console.log(" ..circle",circle.attr('id'),"BEFORE:",circle.attr("class"));
                            circle
                                .classed('main', on);
                            label
                                .classed('on', on || currentZoom >= SHOW_THRESHOLD);
                            label.selectAll('text')
                                .classed('main', on);
                            // console.log(" ..circle",circle.attr('id'),"AFTER:",circle.attr("class"));
                            //J: error in debug, comment for now
                            // console.log(" ..box AFTER:",label.attr("class"));
                            // console.log(" ..label=",label);

                            // activate all siblings
                            // console.log(" ..SIBLINGS ["+on+"]: "+node.links);
                            Object(node.links).forEach(function(target_node) {
                                d3.select("#c" + target_node).classed('sibling', on);
                                label = d3.select('#l' + target_node);
                                label.classed('on', on || currentZoom >= SHOW_THRESHOLD);
                                label.selectAll('text.nlabel')
                                    .classed('sibling', on);
                                // J: hightlihgt links
                                link = d3.select("#link" + node.index + '-' + target_node);
                                // console.log("link:", link)
                                // console.log("link:",link.attr('id'))

                                // turn off highlight link (interfer with highlight instances)
                                // link.classed( 'highlighted', on );
                                // link.style('stroke-width', 3 )
                            });

                            // set the value for the current active movie
                            activeNode = on ? node.index : undefined;
                            // console.log("SHOWNODE finished: "+node.index+" = "+on );
                        }

                        d3.select("input[type=range]")
                            .on("input", inputted);

                        function inputted() {
                            linkStrength_factor = +this.value
                            force
                                .nodes(UGnodeArray)
                                .links(UGlinkArray)
                                .start();
                        }

                        moveToNode = function(new_idx, width_, height_) {
                            console.log("..POS: ", currentOffset.x, currentOffset.y, '->',
                                UGnodeArray[new_idx].x, UGnodeArray[new_idx].y);
                            s = getViewportSize();
                            console.log("ViewportSize:", s);
                            width = s.w < width_ ? s.w : width_;
                            height = s.h < height_ ? s.h : height_;
                            offset = {
                                x: s.x + width / 2 - UGnodeArray[new_idx].x * currentZoom,
                                y: s.y + height / 2 - UGnodeArray[new_idx].y * currentZoom
                            };
                            repositionGraph(offset, undefined, 'move');
                        }

                        selectNode = function(new_idx, doMoveTo) {
                            console.log("SELECT", new_idx, doMoveTo);

                            // do we want to center the graph on the node?
                            doMoveTo = doMoveTo || false;
                            if (doMoveTo) {
                                console.log("..POS: ", currentOffset.x, currentOffset.y, '->',
                                    UGnodeArray[new_idx].x, UGnodeArray[new_idx].y);
                                s = getViewportSize();
                                width = s.w < WIDTH ? s.w : WIDTH;
                                height = s.h < HEIGHT ? s.h : HEIGHT;
                                offset = {
                                    x: s.x + width / 2 - UGnodeArray[new_idx].x * currentZoom,
                                    y: s.y + height / 2 - UGnodeArray[new_idx].y * currentZoom
                                };
                                repositionGraph(offset, undefined, 'move');
                            }
                            // Now highlight the graph node and show its movie panel
                            highlightGraphNode(UGnodeArray[new_idx], true);
                            showMoviePanel(UGnodeArray[new_idx]);
                        }

                        function showMoviePanel(node) {
                            // Fill it and display the panel
                            console.log("node:", node);
                            nodeInfoDiv
                                .html(getNodeInfo(node, UGnodeArray))
                                .attr("class", "panel_on");
                        }

                        function repositionGraph(off, z, mode) {
                            // console.log( "REPOS: off=", off, "zoom=", z, "mode=", mode );

                            // do we want to do a transition?
                            var doTr = (mode == 'move');

                            // drag: translate to new offset
                            if (off !== undefined &&
                                (off.x != currentOffset.x || off.y != currentOffset.y)) {
                                g = d3.select('g.grpParent')
                                if (doTr)
                                    g = g.transition().duration(500);
                                console.log("offset:", off)
                                g.attr("transform", function(d) {
                                    return "translate(" +
                                        off.x + "," + off.y + ")"
                                });
                                currentOffset.x = off.x;
                                currentOffset.y = off.y;
                            }

                            // zoom: get new value of zoom
                            if (z === undefined) {
                                if (mode != 'tick')
                                    return; // no zoom, no tick, we don't need to go further
                                z = currentZoom;
                            } else
                                currentZoom = z;

                            // move edges
                            e = doTr ? graphLinks.transition().duration(500) : graphLinks;
                            e
                                .attr("x1", function(d) { return z * (d.source.x); })
                                .attr("y1", function(d) { return z * (d.source.y); })
                                .attr("x2", function(d) { return z * (d.target.x); })
                                .attr("y2", function(d) { return z * (d.target.y); });

                            // move nodes
                            n = doTr ? graphNodes.transition().duration(500) : graphNodes;
                            n
                                .attr("transform", function(d) {
                                    return "translate(" +
                                        z * d.x + "," + z * d.y + ")"
                                });
                            // move labels
                            l = doTr ? graphLabels.transition().duration(500) : graphLabels;
                            l
                                .attr("transform", function(d) {
                                    return "translate(" +
                                        z * d.x + "," + z * d.y + ")"
                                });
                        }



                        function dragmove(d) {
                            // console.log("DRAG",d3.event);
                            offset = {
                                x: currentOffset.x + d3.event.dx,
                                y: currentOffset.y + d3.event.dy
                            };
                            repositionGraph(offset, undefined, 'drag');
                        }

                        function doZoom(increment) {
                            // this line because drag event trigger zoom as well. This will prevent that!
                            if (!d3.event.sourceEvent.deltaY) return;
                            // newZoom = increment === undefined ? d3.event.scale 
                            //     : zoomScale(currentZoom+increment);
                            // J: 
                            console.log("currentTranslate:", currentTranslate, "d3.event.translate:", d3.event.translate, "d3.event.scale:", d3.event.scale)
                                // newZoom = currentZoom > d3.event.scale  ? zoomScale(currentZoom * d3.event.scale) : d3.event.scale
                                // newZoom = zoomScale(currentZoom * d3.event.scale)
                                // zoom out
                            if (d3.event.translate[0] > currentTranslate[0]) {
                                console.log("Zoom out...")
                                newZoom = zoomScale(currentZoom - zoom_step) //d3.event.scale
                                currentTranslate = d3.event.translate
                            }
                            // zoom in
                            else {
                                console.log("Zoom in...")
                                newZoom = zoomScale(currentZoom + zoom_step)
                                currentTranslate = d3.event.translate
                            }
                            console.log("ZOOM", currentZoom, "->", newZoom, increment);
                            if (currentZoom == newZoom)
                                return; // no zoom change

                            // See if we cross the 'show' threshold in either direction
                            if (currentZoom < SHOW_THRESHOLD && newZoom >= SHOW_THRESHOLD)
                                svg.selectAll("g.label").classed('on', true);
                            else if (currentZoom >= SHOW_THRESHOLD && newZoom < SHOW_THRESHOLD)
                                svg.selectAll("g.label").classed('on', false);

                            // See what is the current graph window size
                            s = getViewportSize();
                            console.log("s:", s)
                            width = s.w < WIDTH ? s.w : WIDTH;
                            height = s.h < HEIGHT ? s.h : HEIGHT;
                            console.log("WIDTH, HEIGHT", WIDTH, HEIGHT)
                            console.log("width, height", width, height)

                            // Compute the new offset, so that the graph center does not move
                            zoomRatio = newZoom / currentZoom;
                            newOffset = {
                                x: currentOffset.x * zoomRatio + width / 2 * (1 - zoomRatio),
                                y: currentOffset.y * zoomRatio + height / 2 * (1 - zoomRatio)
                            };
                            console.log("offset", currentOffset, "->", newOffset);

                            // Reposition the graph
                            repositionGraph(newOffset, newZoom, "zoom");
                        }


                        force.on("tick", function() {
                            console.log('ticking...')
                                // J: in the begining, center the graph and zoom in a little bit
                                // center the graph
                                // console.log("WIDTH:", WIDTH, "HEIGHT:", HEIGHT)
                                // repositionGraph({x:-WIDTH/2, y:-HEIGHT/2}, 2,'zoom');
                            repositionGraph(undefined, undefined, 'tick');
                        });
                        // zoom and center the graph
                        // currentOffset = {x:currentOffset.x - WIDTH/2, y:currentOffset.y - HEIGHT/2}
                        // currentZoom = 3
                        // repositionGraph({x:currentOffset.x - WIDTH/2, y:currentOffset.y - HEIGHT/2}, 3, 'zoom');
                        console.log("force", force)
                    });


                }
                // pagination template
                function template(data) {
                    var html = '<div class="list-group" data-tag="instanceList">';
                    $.each(data, function(index, item) {
                        // should be global variable to be used in the html below: onclick="...
                        instances_list[index] = item;
                        // console.log(instances_list)
                        html += '<a href="#" onclick="highlightInstances(this,' + index + ')" class="list-group-item list-group-item-action">' + item + '</a>';
                    });
                    html += '</div>';
                    return html;
                }

                // highlight union graph
                var active_union_graph = undefined

                function highlightUnionhGraph(union_graph, on) {
                    // If we are to activate a movie, and there's already one active,
                    // first switch that one off
                    if (on && active_union_graph !== undefined) {
                        console.log("!!!!!")
                        highlightUnionhGraph(active_union_graph, false);
                    }
                    nodes = Object.keys(union_graph)
                    console.log("union_nodes:", nodes)
                    nodes.forEach(function(node_index) {
                        circle = d3.select('#c' + node_index);
                        circle.classed('highlight', on);
                        // get node links
                        links = union_graph[node_index]
                            // console.log("node:", node_index, "links:", links)
                        links.forEach(function(target_index) {
                            link = d3.select("#link" + Number(node_index) + '-' + Number(target_index));
                            link.classed('highlighted', on);
                            link.style('stroke-width', 3)
                                // highlight nodes related to links but not in original nodes
                            if (!nodes.includes(target_index)) {
                                circle = d3.select('#c' + target_index);
                                circle.classed('highlight', on);
                            }
                        })
                    });
                    // set the value for the current active movie
                    active_union_graph = union_graph
                        // console.log("SHOWNODE finished: "+node.index+" = "+on );
                }

            }

        });
    }
} // end of D3ok()
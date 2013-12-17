/*
    Based on text description in 
    http://www.policyalmanac.org/games/aStarTutorial.htm
    and the pseudocode in 
    http://en.wikipedia.org/wiki/A*_search_algorithm#Pseudocode
    
    Requires ECMAScript 5 compatible runtime (which most recent browsers have
    http://kangax.github.io/es5-compat-table/
    (as the function Object.keys is used)
*/    

var grid = {};

var goal = {};  // goal, target, node, set at each start (see init())
var current = {};  // chaser node
var obstacleNodes = [];  // array of impassable nodes, defined at start
var closedSet = {};  // nodes on closed list in A* algorithm
var openSet = {};  // nodes on open list in A*
var obstacleSet = {};  // set containing impassable nodes

var pathFindingStepInterval;
var gridPrint;
var stateString;
var starter;
var avoid;



function distanceBetween( node1, node2 ) {
    /*  http://www.policyalmanac.org/games/aStarTutorial.htm says:
        "... the actual distance to move diagonally is the square root of 2 ... or
        roughly 1.414 times the cost of moving horizontally or vertically. We use 10 and 14 
        for simplicity’s sake."  And so we shall here:
    */
    if( node1.row != node2.column && node1.column != node2.column ) {
        return 14;
    } else {
        return 10;
    }
}
function heuristicCostEstimate( node1, node2 ) {
    return Math.abs( node1.row - node2.row ) + Math.abs( node1.column - node2.column );
}
function getNodeInOpenSetHavingTheLowestFScore() {
    var node;
    var lowestFScore = Number.MAX_VALUE;
    for( var key in openSet ) {
        var oneNode = openSet[key];
        if( oneNode.f_score < lowestFScore ) {
            lowestFScore = oneNode.f_score;
            node = oneNode;
        }
    }
    return node;
}
function isNodeOutsideGridOrOnObstacle( node ) {
    return node.row < 0 || 
        node.row+1 > grid.rows || 
        node.column < 0 || 
        node.column+1 > grid.columns || 
        undefined !== obstacleSet[ keyFor(node) ];
}
function getNodeFromOpenOrClosedSetIfPresent( node ) {
    if( isNodeInSet(node, openSet) ) {
        node = getNodeFromSet( node, openSet );
    } else if( isNodeInSet(node, closedSet) ) {
        node = getNodeFromSet( node, closedSet );
    }
    return node;
}
function getNeighborNodes( node ) {
    var neighborNodes = [];
    // let's find the nodes clockwise from the node in the west
    var w = getNodeFromOpenOrClosedSetIfPresent(
        {row: node.row, column: node.column-1, f_score: 0} );
    var nw = getNodeFromOpenOrClosedSetIfPresent(
        {row: node.row-1, column: node.column-1, f_score: 0} );
    var n = getNodeFromOpenOrClosedSetIfPresent(
        {row: node.row-1, column: node.column, f_score: 0} );
    var ne = getNodeFromOpenOrClosedSetIfPresent(
        {row: node.row-1, column: node.column+1, f_score: 0} );
    var e = getNodeFromOpenOrClosedSetIfPresent(
        {row: node.row, column: node.column+1, f_score: 0} );
    var se = getNodeFromOpenOrClosedSetIfPresent(
        {row: node.row+1, column: node.column+1, f_score: 0} );
    var s = getNodeFromOpenOrClosedSetIfPresent(
        {row: node.row+1, column: node.column, f_score: 0} );
    var sw = getNodeFromOpenOrClosedSetIfPresent(
        {row: node.row+1, column: node.column-1, f_score: 0} );
    
    if( ! isNodeOutsideGridOrOnObstacle(w) ) neighborNodes.push(w);
    if( ! isNodeOutsideGridOrOnObstacle(nw) ) neighborNodes.push(nw);
    if( ! isNodeOutsideGridOrOnObstacle(n) ) neighborNodes.push(n);
    if( ! isNodeOutsideGridOrOnObstacle(ne) ) neighborNodes.push(ne);
    if( ! isNodeOutsideGridOrOnObstacle(e) ) neighborNodes.push(e);
    if( ! isNodeOutsideGridOrOnObstacle(se) ) neighborNodes.push(se);
    if( ! isNodeOutsideGridOrOnObstacle(s) ) neighborNodes.push(s);
    if( ! isNodeOutsideGridOrOnObstacle(sw) ) neighborNodes.push(sw);
    
    return neighborNodes;
}
function keyFor( node ) {
    return node.row+'_'+node.column;
}
function isNodeInSet( node, set ) {
    return undefined !== set[ keyFor(node) ];
}
function getNodeFromSet( node, set ) {
    return set[ keyFor(node) ];
}
function addNodeToSet( node, set ) {
    set[ keyFor(node) ] = node;
}
function removeNodeFromSet( node, set ) {
    delete set[ keyFor(node) ];
}
function areNodesEqual( node1, node2 ) {
    return node1.row == node2.row && node1.column == node2.column;
}
function areNodesNeighbors( node1, node2 ) {
    return !areNodesEqual(node1, node2) && 
        (node2.column >= node1.column-1 && node2.column <= node1.column+1) &&
        (node2.row >= node1.row-1 && node2.row <= node1.row+1);
}
function canAvoidBeingNeighbor( node ) {
    // given that the chasing node is already next to the target
    // and if the target is on the perimeter of the grid, then it 
    // can't avoid being neighbor to the chaser with one move.
    return node.row !== 0 && node.row+1 !== grid.rows && 
        node.column !== 0 && node.column+1 !== grid.columns;
}
function isSetEmpty( set ) {
    return Object.keys( set ).length === 0;
}
function randomFromInterval( from, to ) {
    return Math.floor(Math.random()*(to-from+1)+from);
}



function onePathfindingStep() {
    // This function is pretty much like the pseudocode in
    // http://en.wikipedia.org/wiki/A*_search_algorithm#Pseudocode
    
    if( ! isSetEmpty( openSet ) ) {
        
        current = getNodeInOpenSetHavingTheLowestFScore();
        if( areNodesEqual( current, goal ) ) {
            
            window.clearInterval( pathFindingStepInterval );
            pathFindingStepInterval = null;
            
            stateString += "\t\t\t\tG A M E   O V E R\n";
            stateString += "\t\t\t\t (target reached)\n\n\n";
            starter.disabled = false;
            avoid.disabled = false;
        }
        
        removeNodeFromSet( current, openSet );
        addNodeToSet( current, closedSet );
        getNeighborNodes(current).forEach(function(neighbor){
            var tentative_g_score = current.g_score + distanceBetween(current, neighbor);
            var tentative_f_score = tentative_g_score + heuristicCostEstimate(neighbor, goal);
            if( isNodeInSet(neighbor, closedSet) && tentative_f_score >= neighbor.f_score ) {
                return;
            }
            if( ! isNodeInSet(neighbor, openSet) || tentative_f_score < neighbor.f_score ) {
                neighbor.came_from = current; // not used, as we don't trace the path back
                neighbor.g_score = tentative_g_score;
                neighbor.f_score = tentative_f_score;
                if( ! isNodeInSet(neighbor, openSet) ) {
                    addNodeToSet( neighbor, openSet );
                }
            }
        });
    } else {
        window.clearInterval( pathFindingStepInterval );
        pathFindingStepInterval = null;
        stateString += "\t\t\t    G A M E   E X H A U S T E D\n";
        stateString += "\t\t\t\t(open set is empty)\n\n\n";
        starter.disabled = false;
        avoid.disabled = false;
    }
}

function oneAvoidStep() {
    if( pathFindingStepInterval ) {
        var newGoal;
        do {
            xMovement = randomFromInterval( -1, 1 );
            yMovement = randomFromInterval( -1, 1 );
            newGoal = { row: goal.row + yMovement, column: goal.column + xMovement };
        } while( 
                areNodesEqual(goal, newGoal) || 
                isNodeOutsideGridOrOnObstacle(newGoal) ||
                areNodesEqual(newGoal, current) ||
                // too close to the chaser, find another move:
                (areNodesNeighbors(newGoal, current) && canAvoidBeingNeighbor(newGoal))
        );
        goal.row = newGoal.row;
        goal.column = newGoal.column;
    }
}

function drawState() {
    if( pathFindingStepInterval ) {
        stateString = "\n\n\n\n";
    }
    for( var row = 0; row < grid.rows; row++ ) {
        for( var column = 0; column < grid.columns; column++ ) {
            if( obstacleSet[row+'_'+column] ) {
                stateString += '\tO';  // obstacle block
            } else if( current.row == row && current.column == column && 
                      goal.row == row && goal.column == column) {
                stateString += '\tX'; // goal reached
            } else if( current.row == row && current.column == column ) {
                stateString += '\tC'; // chasing / current player
            } else if( goal.row == row && goal.column == column ) {
                stateString += '\tT'; // goal, target, chased player
            } else {
                stateString += "\t_";
            }
        }
        stateString += "\n\n\n";
    }
    if(document.all){
        gridPrint.innerText = stateString ;
    } else { // Firefox
        gridPrint.textContent = stateString;
    }
}

function chase() {
    stateString = "";
    
    onePathfindingStep();
    
    if( avoid.checked ) {
        oneAvoidStep();
    }
    drawState();
}

function init() {
    grid = {rows: 6, columns: 8};
    
    goal = { row: 2, column: 6 };
    current = { row: 2, column: 2, g_score: 0 }; // zero based
    obstacleNodes = [{row:1, column:4},{row:2, column:4},{row:3, column:4}];
    current.f_score = current.g_score + heuristicCostEstimate(current, goal);
    closedSet = {};
    openSet = {};
    obstacleSet = {};
    addNodeToSet( current, openSet );
    obstacleNodes.forEach(function(obstacleNode){
        addNodeToSet( obstacleNode, obstacleSet );
    });
}

window.onload=function() {

    gridPrint = document.getElementById("grid");
    starter = document.getElementById("starter");
    avoid = document.getElementById("avoid");
    starter.onclick = function() {
        init();
        pathFindingStepInterval = setInterval(function(){chase();}, 300);
        starter.disabled = true;
        avoid.disabled = true;
    };
};
class Graph {
  constructor() {
    this.graph = new Map();
  }

  _findLowestNode(trackedCost, processedNode) {
    let lowestCost = Infinity;
    let lowestNode = null;
    Object.keys(trackedCost).forEach((key) => {
      if (
        processedNode.indexOf(key) < 0
        && lowestCost > trackedCost[key]
      ) {
        lowestCost = trackedCost[key];
        lowestNode = key;
      }
    });
    return lowestNode;
  }

  // name as string
  // neighbors as map {B:5,C:5}
  addNode(name, neighbors) {
    if (typeof name !== 'string') {
      throw Error('Node name should be string.');
    }

    if (neighbors instanceof Map) {
      for (const nextNode in neighbors.keys) {
        if (nextNode === name) {
          throw Error('Input node should not appear in neighbors.');
        }
        if (neighbors[nextNode] < 0) {
          throw Error('Input distance should not be negative number.');
        }
      }
      this.graph.set(name, neighbors);
    } else {
      throw Error('Node neighbors should be Map.');
    }
  }

  path(start, goal) {
    let startInList = false;
    let goalInList = false;

    this.graph.forEach((value, key) => {
      if (key === start) {
        startInList = true;
      }
      value.forEach((distance, neighbor) => {
        if (neighbor === goal) {
          goalInList = true;
        }
      });
    });
    if (!(startInList && goalInList)) {
      throw Error('Start Node or Goal Node does not exist.');
    }

    const processedNode = [goal];
    const trackedCost = {};
    trackedCost[goal] = Infinity;
    const trackedPath = {};
    trackedPath[goal] = null;
    // Add Start Point
    this.graph.get(start).forEach((distance, nextNode) => {
      trackedCost[nextNode] = distance;
      trackedPath[nextNode] = start;
    });
    let nextProcessNode = this._findLowestNode(trackedCost, processedNode);
    while (nextProcessNode) {
      processedNode.push(nextProcessNode);
      if (this.graph.get(nextProcessNode)) {
        this.graph.get(nextProcessNode).forEach((distance, nextNode) => {
          if (
            trackedCost[nextNode] == null
            || trackedCost[nextProcessNode] + distance < trackedCost[nextNode]
          ) {
            trackedCost[nextNode] = trackedCost[nextProcessNode] + distance;
            trackedPath[nextNode] = nextProcessNode;
          }
        });
      }

      nextProcessNode = this._findLowestNode(trackedCost, processedNode);
    }

    if (trackedPath[goal] === null) {
      throw Error('No path to destination.');
    }
    // track path back
    let rootNode = goal;
    const resultPath = [goal];
    while (rootNode !== start) {
      rootNode = trackedPath[rootNode];
      resultPath.push(rootNode);
    }
    return { distance: trackedCost[goal], path: resultPath.reverse() };
  }
}

//module.exports = Graph;

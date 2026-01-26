class MapManager {
    constructor() {
        this.floors = 12;
        this.nodeTypes = [
            { type: 'battle', weight: 50 },
            { type: 'event', weight: 25 },
            { type: 'shop', weight: 10 },
            { type: 'rest', weight: 15 }
        ];
    }

    generateMap() {
        const map = [];

        // 1. Генерация этажей
      
for (let x = 0; x < this.floors; x++) {
            const layer = [];
            let count;
            if (x === 0 || x === this.floors - 1) count = 1;
            else if (x === this.floors - 2) count = 2;
            else count = Math.floor(Math.random() * 3) + 3;

            const offsetY = (5 - count) / 2;

            for (let i = 0; i < count; i++) {
                let type = 'battle';
                if (x === 0) type = 'start';
                else if (x === this.floors - 1) type = 'boss';
                else if (x === this.floors - 2) type = 'rest';
                else type = this.getRandomType();

                layer.push({
                    id: `${x}-${i}`,
                    x,
                    y: i + offsetY,
                    type,
                    connections: [],
                    visible: x === 0,
                    status: x === 0 ? 'available' : 'locked'
                });
            }

            map.push(layer);
        }
      
  // 2. Генерация связей между этажами
        for (let x = 0; x < map.length - 1; x++) {
            const currentLayer = map[x];
            const nextLayer = map[x + 1];

            currentLayer.forEach((node) => {
                const connectionsCount = Math.random() > 0.5 ? 2 : 1;
                const targets = this.pickRandomNodes(nextLayer, connectionsCount);
                targets.forEach((target) => node.connections.push(target.id));
            });

          // Гарантируем, что каждый узел следующего слоя имеет входящую связь
            nextLayer.forEach((node) => {
                const hasIncoming = currentLayer.some((prev) => prev.connections.includes(node.id));
                if (!hasIncoming) {
                    const randomPrev = currentLayer[Math.floor(Math.random() * currentLayer.length)];
                    randomPrev.connections.push(node.id);
                }
            });
        }

        return map;
    }

  getRandomType() {
        const totalWeight = this.nodeTypes.reduce((sum, node) => sum + node.weight, 0);
        let rand = Math.random() * totalWeight;

        for (let nodeType of this.nodeTypes) {
            rand -= nodeType.weight;
            if (rand <= 0) return nodeType.type;
        }

        return 'battle';
    }

    pickRandomNodes(nodes, count) {
        const shuffled = [...nodes].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(count, nodes.length));
    }

  static unlockNextLayer(mapData, nodeId) {
        let nextLayerIndex = null;

        for (let layerIndex = 0; layerIndex < mapData.length; layerIndex++) {
            const node = mapData[layerIndex].find((item) => item.id === nodeId);
            if (node) {
                node.status = 'completed';
                nextLayerIndex = layerIndex + 1;
                break;
            }
        }

        if (nextLayerIndex === null || nextLayerIndex >= mapData.length) {
            return;
        }

    mapData[nextLayerIndex].forEach((node) => {
            const hasIncoming = mapData[nextLayerIndex - 1].some((prev) => prev.connections.includes(node.id));
            if (hasIncoming) {
                node.visible = true;
                if (node.status !== 'completed') {
                    node.status = 'available';
                }
            }
        });
    }
}

globalThis.MapManager = MapManager;
  
if (!globalThis.MapManager) {
    class MapManager {
        constructor() {
            this.floors = 12;
            this.nodeTypes = [
                { type: 'battle', weight: 50 },
                { type: 'event', weight: 25 },
                { type: 'shop', weight: 10 },
                { type: 'rest', weight: 15 }
            ];
        }

        generateMap() {
            const map = [];

            // 1. Генерация этажей
            for (let x = 0; x < this.floors; x++) {
                const layer = [];
                let count;
                if (x === 0 || x === this.floors - 1) count = 1;
                else if (x === this.floors - 2) count = 2;
                else count = Math.floor(Math.random() * 3) + 3;

                const offsetY = (5 - count) / 2;

                for (let i = 0; i < count; i++) {
                    let type = 'battle';
                    if (x === 0) type = 'start';
                    else if (x === this.floors - 1) type = 'boss';
                    else if (x === this.floors - 2) type = 'rest';
                    else type = this.getRandomType();

                    layer.push({
                        id: `${x}-${i}`,
                        x,
                        y: i + offsetY,
                        type,
                        connections: [],
                        visible: x === 0,
                        status: x === 0 ? 'available' : 'locked'
                    });
                }

                layer.push({
                   id: `${x}-${i}`,
                  x,
                   y: i + offsetY,
                    type,
                  connections: [],
                   visible: x === 0,
                    status: x === 0 ? 'available' : 'locked'
              });
           }

          map.push(layer);
        }

      // 2. Генерация связей между этажами
       for (let x = 0; x < map.length - 1; x++) {
            const currentLayer = map[x];
            const nextLayer = map[x + 1];

           currentLayer.forEach((node) => {
               const connectionsCount = Math.random() > 0.5 ? 2 : 1;
                const targets = this.pickRandomNodes(nextLayer, connectionsCount);
               targets.forEach((target) => node.connections.push(target.id));
           });

            // Гарантируем, что каждый узел следующего слоя имеет входящую связь
           nextLayer.forEach((node) => {
               const hasIncoming = currentLayer.some((prev) => prev.connections.includes(node.id));
               if (!hasIncoming) {
                    const randomPrev = currentLayer[Math.floor(Math.random() * currentLayer.length)];
                   randomPrev.connections.push(node.id);
               }
           });
        }

        return map;
    }

   getRandomType() {
       const totalWeight = this.nodeTypes.reduce((sum, node) => sum + node.weight, 0);
       let rand = Math.random() * totalWeight;

       for (let nodeType of this.nodeTypes) {
           rand -= nodeType.weight;
           if (rand <= 0) return nodeType.type;
        }

        return 'battle';
    }

    pickRandomNodes(nodes, count) {
        const shuffled = [...nodes].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(count, nodes.length));
    }

    static unlockNextLayer(mapData, nodeId) {
        let nextLayerIndex = null;

        for (let layerIndex = 0; layerIndex < mapData.length; layerIndex++) {
            const node = mapData[layerIndex].find((item) => item.id === nodeId);
            if (node) {
                node.status = 'completed';
                nextLayerIndex = layerIndex + 1;
                break;
            }
        }

        if (nextLayerIndex === null || nextLayerIndex >= mapData.length) {
            return;
       }

        mapData[nextLayerIndex].forEach((node) => {
            const hasIncoming = mapData[nextLayerIndex - 1].some((prev) => prev.connections.includes(node.id));
            if (hasIncoming) {
                node.visible = true;
                if (node.status !== 'completed') {
                    node.status = 'available';
                }
            }
        });
   }
}

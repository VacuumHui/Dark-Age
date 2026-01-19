// Файл: src/managers/MapManager.js

export class MapManager {
    constructor() {
        this.floors = 12; 
        this.nodeTypes = [
            { type: 'battle', weight: 55 },
            { type: 'event', weight: 20 },
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
                    x: x,
                    y: offsetY + i, 
                    type: type,
                    status: (x === 0) ? 'available' : 'locked',
                    visible: (x === 0),
                    connections: []
                });
            }
            map.push(layer);
        }

        // 2. Связи
        for (let x = 0; x < this.floors - 1; x++) {
            const currentLayer = map[x];
            const nextLayer = map[x + 1];

            currentLayer.forEach(node => {
                const neighbors = nextLayer.filter(next => Math.abs(next.y - node.y) <= 1.5);
                
                if (neighbors.length > 0) {
                    const primary = Phaser.Utils.Array.GetRandom(neighbors);
                    node.connections.push(primary.id);
                    neighbors.forEach(n => {
                        if (n.id !== primary.id && Math.random() < 0.7) {
                            node.connections.push(n.id);
                        }
                    });
                }
            });

            nextLayer.forEach(nextNode => {
                const hasParent = currentLayer.some(n => n.connections.includes(nextNode.id));
                if (!hasParent) {
                    let closestParent = currentLayer[0];
                    let minDiff = 999;
                    currentLayer.forEach(parent => {
                        const diff = Math.abs(parent.y - nextNode.y);
                        if (diff < minDiff) {
                            minDiff = diff;
                            closestParent = parent;
                        }
                    });
                    closestParent.connections.push(nextNode.id);
                }
            });
        }

        return map;
    }

    getRandomType() {
        const rand = Math.random() * 100;
        let cumulative = 0;
        for (let item of this.nodeTypes) {
            cumulative += item.weight;
            if (rand <= cumulative) return item.type;
        }
        return 'battle';
    }

    // --- ВОТ ЗДЕСЬ ИСПРАВЛЕНИЕ ---
    static unlockNextLayer(mapData, currentNodeId) {
        // 1. Находим текущий узел
        let currentNode = null;
        for (let layer of mapData) {
            const found = layer.find(n => n.id === currentNodeId);
            if (found) { currentNode = found; break; }
        }

        if (!currentNode) return;

        // 2. Помечаем его как пройденный
        currentNode.status = 'completed';

        // 3. БЛОКИРУЕМ СОСЕДЕЙ (Те, что были на этом же этаже, но мы их не выбрали)
        const currentLayer = mapData[currentNode.x];
        currentLayer.forEach(node => {
            if (node.id !== currentNodeId) {
                node.status = 'locked'; // Запрещаем вход
                // node.visible = true; // Можно оставить видимым, чтобы игрок видел, что упустил
            }
        });

        // 4. Открываем следующий этаж (только связанные узлы)
        const nextLayerIndex = currentNode.x + 1;
        if (nextLayerIndex < mapData.length) {
            const nextLayer = mapData[nextLayerIndex];
            nextLayer.forEach(nextNode => {
                if (currentNode.connections.includes(nextNode.id)) {
                    nextNode.visible = true;
                    nextNode.status = 'available';
                } else {
                    // Те узлы на следующем этаже, к которым НЕ ведет путь, остаются закрытыми
                    if (nextNode.status !== 'completed') nextNode.status = 'locked';
                }
            });
        }
    }
}

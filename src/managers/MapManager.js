// src/managers/MapManager.js

export class MapManager {
    constructor() {
        this.floors = 12; // Сделаем карту подлиннее
        this.nodeTypes = [
            { type: 'battle', weight: 55 },
            { type: 'event', weight: 20 },
            { type: 'shop', weight: 10 },
            { type: 'rest', weight: 15 }
        ];
    }

    generateMap() {
        const map = [];

        // 1. ГЕНЕРАЦИЯ ЭТАЖЕЙ
        for (let x = 0; x < this.floors; x++) {
            const layer = [];
            
            // ПРАВИЛО:
            // 0 этаж = 1 узел (Старт)
            // Последний этаж = 1 узел (Босс)
            // Середина = 3-5 узлов (Чтобы было где разгуляться)
            let count;
            if (x === 0 || x === this.floors - 1) count = 1;
            else if (x === this.floors - 2) count = 2; // Перед боссом сужаем
            else count = Math.floor(Math.random() * 3) + 3; // 3, 4 или 5 комнат
            
            // Центрируем узлы по вертикали (y), чтобы карта была красивой елочкой
            // y будет не 0,1,2, а, например, 1,2,3, если ряд широкий
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
                    y: offsetY + i, // Сдвигаем Y для красоты
                    type: type,
                    status: (x === 0) ? 'available' : 'locked',
                    visible: (x === 0),
                    connections: []
                });
            }
            map.push(layer);
        }

        // 2. СОЗДАНИЕ ВЕТВЛЕНИЙ (ПАУТИНА)
        for (let x = 0; x < this.floors - 1; x++) {
            const currentLayer = map[x];
            const nextLayer = map[x + 1];

            // Для каждого узла текущего слоя
            currentLayer.forEach(node => {
                // Ищем узлы в следующем слое, которые БЛИЗКО по высоте (y)
                const neighbors = nextLayer.filter(next => Math.abs(next.y - node.y) <= 1.5);
                
                // Обязательно соединяем с одним случайным соседом
                if (neighbors.length > 0) {
                    const primary = Phaser.Utils.Array.GetRandom(neighbors);
                    node.connections.push(primary.id);

                    // С вероятностью 70% соединяем со ВТОРЫМ соседом (Ветвление!)
                    neighbors.forEach(n => {
                        if (n.id !== primary.id && Math.random() < 0.7) {
                            node.connections.push(n.id);
                        }
                    });
                }
            });

            // ПРОВЕРКА СИРОТ (Orphans)
            // Если у узла в следующем слое нет входящих связей, соединяем его с ближайшим предком
            nextLayer.forEach(nextNode => {
                const hasParent = currentLayer.some(n => n.connections.includes(nextNode.id));
                if (!hasParent) {
                    // Ищем ближайшего по Y из предыдущего слоя
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

    static unlockNextLayer(mapData, currentNodeId) {
        let currentNode = null;
        for (let layer of mapData) {
            const found = layer.find(n => n.id === currentNodeId);
            if (found) { currentNode = found; break; }
        }

        if (!currentNode) return;
        currentNode.status = 'completed';

        const nextLayerIndex = currentNode.x + 1;
        if (nextLayerIndex < mapData.length) {
            const nextLayer = mapData[nextLayerIndex];
            nextLayer.forEach(nextNode => {
                if (currentNode.connections.includes(nextNode.id)) {
                    nextNode.visible = true;
                    nextNode.status = 'available';
                } else {
                    if (nextNode.status !== 'completed') nextNode.status = 'locked';
                }
            });
        }
    }
}

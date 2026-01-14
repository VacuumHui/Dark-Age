// src/managers/MapManager.js

export class MapManager {
    constructor() {
        this.floors = 10; // Длина карты (количество этажей)
        
        // Веса для рандома (пока простые)
        this.nodeTypes = [
            { type: 'battle', weight: 70 },
            { type: 'event', weight: 10 },
            { type: 'shop', weight: 10 },
            { type: 'rest', weight: 10 }
        ];
    }

    generateMap() {
        const map = [];

        // 1. ГЕНЕРАЦИЯ СЕТКИ (СЛЕВА НАПРАВО)
        for (let x = 0; x < this.floors; x++) {
            const layer = [];
            // Сколько узлов на этаже? (Первый и последний - по 1, в середине 2-3)
            const count = (x === 0 || x === this.floors - 1) ? 1 : Math.floor(Math.random() * 2) + 2;
            
            for (let y = 0; y < count; y++) {
                // Тип комнаты
                let type = 'battle';
                if (x === 0) type = 'start';
                else if (x === this.floors - 1) type = 'boss';
                else if (x === this.floors - 2) type = 'rest'; // Перед боссом костер
                else type = this.getRandomType();

                layer.push({
                    id: `${x}-${y}`, // Уникальный ID (этаж-номер)
                    x: x,            // Этаж
                    y: y,            // Позиция по вертикали
                    type: type,
                    status: 'locked',   // locked, available, completed
                    visible: (x === 0), // Туман войны: виден только 1 этаж сразу
                    connections: []     // Куда ведет этот узел
                });
            }
            map.push(layer);
        }

        // 2. СОЗДАНИЕ СВЯЗЕЙ (CONNECTIONS)
        for (let x = 0; x < this.floors - 1; x++) {
            const currentLayer = map[x];
            const nextLayer = map[x + 1];

            currentLayer.forEach(node => {
                // Связываем с узлом справа, который ближе всего по высоте (y)
                // Это простая логика, чтобы линии не пересекались безумно
                const ratio = node.y / (currentLayer.length - 1 || 1);
                const targetIndex = Math.round(ratio * (nextLayer.length - 1));
                
                // Гарантированная связь
                const targetNode = nextLayer[targetIndex];
                node.connections.push(targetNode.id);

                // Случайная доп. связь (ветвление)
                if (Math.random() > 0.5 && nextLayer.length > 1) {
                    const neighborIndex = targetIndex + (Math.random() > 0.5 ? 1 : -1);
                    if (nextLayer[neighborIndex]) {
                        const neighborId = nextLayer[neighborIndex].id;
                        if (!node.connections.includes(neighborId)) {
                            node.connections.push(neighborId);
                        }
                    }
                }
            });

            // ПРОВЕРКА СИРОТ: У каждого узла след. слоя должен быть родитель
            nextLayer.forEach(nextNode => {
                const hasParent = currentLayer.some(n => n.connections.includes(nextNode.id));
                if (!hasParent) {
                    const randomParent = currentLayer[Math.floor(Math.random() * currentLayer.length)];
                    randomParent.connections.push(nextNode.id);
                }
            });
        }

        // Открываем первый узел
        map[0][0].status = 'available';
        
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

    // ЛОГИКА ТУМАНА ВОЙНЫ: Открываем следующие узлы
    static unlockNextLayer(mapData, currentNodeId) {
        // Находим текущий узел в массиве
        let currentNode = null;
        for (let layer of mapData) {
            const found = layer.find(n => n.id === currentNodeId);
            if (found) { currentNode = found; break; }
        }

        if (!currentNode) return;

        currentNode.status = 'completed';

        // Смотрим следующий слой
        const nextLayerIndex = currentNode.x + 1;
        if (nextLayerIndex < mapData.length) {
            const nextLayer = mapData[nextLayerIndex];
            
            nextLayer.forEach(nextNode => {
                // Если наш текущий узел связан с этим следующим
                if (currentNode.connections.includes(nextNode.id)) {
                    nextNode.visible = true;    // Убираем туман
                    nextNode.status = 'available'; // Разрешаем вход
                } else {
                    // Остальные узлы на следующем этаже блокируем (мы пошли по другой ветке)
                    if (nextNode.status !== 'completed') {
                        nextNode.status = 'locked';
                        // nextNode.visible = false; // Можно скрыть, а можно оставить видимым, но серым
                    }
                }
            });
        }
    }
}

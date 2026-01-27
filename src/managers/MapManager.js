// Файл: src/managers/MapManager.js

export class MapManager {
    constructor() {
        this.floors = 12; // Количество этажей
        
        // Веса для случайных комнат
        this.nodeTypes = [
            { type: 'battle', weight: 55 },
            { type: 'event', weight: 20 },
            { type: 'shop', weight: 10 },
            { type: 'rest', weight: 15 }
        ];
    }

    generateMap() {
        const map = [];

        // --- 1. ГЕНЕРАЦИЯ ЭТАЖЕЙ (УЗЛОВ) ---
        for (let x = 0; x < this.floors; x++) {
            const layer = [];
            
            // Определяем количество комнат на этаже
            let count;
            if (x === 0) count = 1; // Старт
            else if (x === this.floors - 1) count = 1; // Босс
            else if (x === this.floors - 2) count = 2; // Перед боссом (обычно костры)
            else count = Math.floor(Math.random() * 3) + 3; // 3, 4 или 5 комнат в середине
            
            // Центрируем комнаты по вертикали
            const offsetY = (5 - count) / 2; 

            for (let i = 0; i < count; i++) {
                // Выбираем тип комнаты
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
                    // Первый этаж доступен сразу, остальные закрыты и невидимы
                    status: (x === 0) ? 'available' : 'locked',
                    visible: (x === 0),
                    connections: []
                });
            }
            map.push(layer);
        }

        // --- 2. СОЗДАНИЕ СВЯЗЕЙ (ПУТЕЙ) ---
        for (let x = 0; x < this.floors - 1; x++) {
            const currentLayer = map[x];
            const nextLayer = map[x + 1];

            // Проход 1: Каждый узел текущего слоя ищет себе пару впереди
            currentLayer.forEach(node => {
                // Ищем узлы в след. слое, которые близко по Y
                const neighbors = nextLayer.filter(next => Math.abs(next.y - node.y) <= 1.5);
                
                if (neighbors.length > 0) {
                    // Гарантированно соединяем с одним случайным соседом
                    const primary = Phaser.Utils.Array.GetRandom(neighbors);
                    node.connections.push(primary.id);

                    // С шансом 70% соединяем еще с одним (ветвление)
                    neighbors.forEach(n => {
                        if (n.id !== primary.id && Math.random() < 0.7) {
                            node.connections.push(n.id);
                        }
                    });
                }
            });

            // Проход 2: Защита от "Сирот" (Orphans)
            // Проверяем, есть ли в след. слое узлы, к которым никто не ведет
            nextLayer.forEach(nextNode => {
                const hasParent = currentLayer.some(n => n.connections.includes(nextNode.id));
                if (!hasParent) {
                    // Если родителя нет - привязываем к ближайшему узлу из текущего слоя
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

    // --- ЛОГИКА ПЕРЕХОДА (ТУМАН ВОЙНЫ) ---
    static unlockNextLayer(mapData, currentNodeId) {
        // 1. Находим текущий выбранный узел
        let currentNode = null;
        for (let layer of mapData) {
            const found = layer.find(n => n.id === currentNodeId);
            if (found) { currentNode = found; break; }
        }

        if (!currentNode) return;

        // 2. Помечаем его пройденным
        currentNode.status = 'completed';

        // 3. БЛОКИРУЕМ остальных на этом этаже (чтобы нельзя было вернуться и выбрать другой путь)
        const currentLayer = mapData[currentNode.x];
        currentLayer.forEach(node => {
            if (node.id !== currentNodeId) {
                node.status = 'locked'; 
            }
        });

        // 4. ОТКРЫВАЕМ следующий этаж
        const nextLayerIndex = currentNode.x + 1;
        if (nextLayerIndex < mapData.length) {
            const nextLayer = mapData[nextLayerIndex];
            
            nextLayer.forEach(nextNode => {
                // Если есть связь от текущего узла к следующему
                if (currentNode.connections.includes(nextNode.id)) {
                    nextNode.visible = true;    // Показываем
                    nextNode.status = 'available'; // Разрешаем вход
                } else {
                    // Если связи нет, узел остается закрытым (или становится серым)
                    if (nextNode.status !== 'completed') {
                        nextNode.status = 'locked';
                        // nextNode.visible = true; // Можно раскомментировать, если хотим видеть всю карту, но серую
                    }
                }
            });
        }
    }
}

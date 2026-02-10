export const ENEMIES_DB = {
     // --- ОБЫЧНЫЕ ---
     "slime": {
         name: "Ядовитый Слайм", 
         hp: 25, 
         color: 0x00aa44,
         cost: 1, // <--- НОВОЕ: Дешевый враг
         moves: [
            { name: "Тычок", chance: 0.45, actions: [{ type: "damage", value: 5 }] },
            { name: "Плевок", chance: 0.35, actions: [{ type: "damage", value: 3 }, { type: "apply_status", status: "poison", value: 2 }] }
         ]
     },
     "knight": {
         name: "Рыцарь", 
         hp: 60, 
         color: 0x440088,
         cost: 3, // <--- НОВОЕ: Дорогой враг
         moves: [
           { name: "Удар", chance: 0.4, actions: [{ type: "damage", value: 10 }] },
          { name: "Клич", chance: 0.35, target: "self", actions: [{ type: "apply_status", status: "strength", value: 3 }, { type: "block", value: 5 }] },
             { name: "Блок", chance: 0.25, target: "self", actions: [{ type: "block", value: 12 }] }
         ]
     },
 
     // --- БОССЫ ---
     "boss_dragon": {
         name: "Древний Дракон", 
         hp: 250, 
         color: 0xff4400, 
         cost: 10, // <--- НОВОЕ: Очень дорогой (занимает весь бюджет)
         tier: "boss",    
         moves: [
             { 
                 name: "Огненное дыхание", 
                chance: 0.35, 
                 actions: [ 
                     { type: "damage", value: 15 },
                     { type: "apply_status", status: "vulnerable", value: 2 } 
                 ] 
             },
             { 
                 name: "Взлет",  
               chance: 0.35, 
                 target: "self",
                 actions: [ 
                     { type: "block", value: 20 },
                     { type: "apply_status", status: "strength", value: 2 }
                 ] 
             },
             {
                 name: "Когти",
                 chance: 0.3,
                 actions: [ { type: "damage", value: 8 } ] 
             }
         ]
     }
 };


 // Файл: src/managers/MapManager.js
 
 export class MapManager {
     constructor() {
         this.floors = 12; 
         this.nodeTypes = [
-            { type: 'battle', weight: 55 },
-            { type: 'event', weight: 20 },
+            { type: 'battle', weight: 50 },
+            { type: 'event', weight: 25 },
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
 

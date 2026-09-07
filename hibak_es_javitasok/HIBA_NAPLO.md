# Hibák és Javítások Naplója (Error & Fix Log)

Ez a dokumentum rögzíti az alkalmazás fejlesztése során felmerült hibákat, azok pontos kiváltó okát (Root Cause), és a végrehajtott javításokat, megelőzve a hibák újbóli előfordulását.

---

## 1. Hiba: Gyors kitöltés nem működik publikálás / szinkronizáció után (Quick Fill Not Persisting After Publishing)

### Hibajelenség
A felhasználó rákattintott a „Heti gyorskitöltés” gombra, beállította a szülők munkaidejét (pl. Apa 07:00–15:00, Anya 06:00–18:00), elmentette, de az alkalmazás újratöltésekor vagy publikált környezetben (Cloud Run / megosztott linken) a műszakok eltűntek vagy nem jelentek meg a naptárban.

### Kiváltó okok (Root Causes)
1. **Szerveroldali kiszűrés (`server.ts`)**:
   A `server.ts` `saveFamilyHandler` metódusában a beérkező `sanitizedIncomingShifts` tömböt a szerver átengedte a `!deletedShiftSet.has(s.id)` szűrőn. Ha a kliens korábban vagy a heti kitöltés során bármilyen törlési azonosítót küldött (pl. unselected napok esetén), a frissen beküldött új műszakot a szerver töröltnek tekintette és eldobta a mentésből.
2. **Kliensoldali Firestore `pushFamilyData` dupla szűrés (`syncService.ts`)**:
   A `pushFamilyData` függvény a memóriában már frissített `shifts` tömbön lefuttatott egy `finalShifts.filter(s => !delSet.has(s.id))` szűrést. Mivel az `App.tsx` állapota már csak az érvényes műszakokat tartalmazta, ez a szűrés véletlenül kitörölte az újonnan hozzáadott műszakokat, ha azok azonosítója valaha szerepelt a törlési gyorsítótárban.
3. **Időbélyeg nélküli felülírás `mergeShifts` során (`syncService.ts`)**:
   A `mergeShifts(local, incoming)` függvény nem vette figyelembe a műszakok `updatedAt` mezőjét. A szerverről beérkező régebbi (akár üres vagy elavult) adatok vakon felülírták a friss helyi gyorskitöltést.
4. **ID alapú felülírás hiányossága (`App.tsx` `handleBatchApplyShifts`)**:
   A korábbi szűrés csak `s.id` alapján szűrt. Ha egy korábbi műszak véletlenszerű azonosítóval rendelkezett (pl. egyedi napi mentésből), az új `apa-YYYY-MM-DD` azonosítójú heti műszak nem írta felül a régit, így a naptár a legrégebbi műszakot jelenítette meg.

### Megoldás és Javítás
1. **`server.ts`**: A kliens által kifejezetten beküldött érvényes műszakok (`sanitizedIncomingShifts`) mindig bekerülnek a `shiftMap`-be `${s.memberId}_${s.date}` kulccsal, megelőzve, hogy a `deletedShiftSet` eldobja őket.
2. **`syncService.ts`**: A `pushFamilyData` a kliens által átadott érvényes `shifts` listát menti Firestore-ba. A `mergeShifts` szigorúan ellenőrzi az `updatedAt` időbélyeget, így frissebb helyi adatot sosem ír felül elavult szerverállapot.
3. **`App.tsx`**: A `handleBatchApplyShifts` személy és dátum (`${s.memberId}_${s.date}`) szerint egyértelműen felülírja az előző műszakot, törli az azonosítót a `deletedShiftIdsRef`-ből, és azonnal lementi a helyi tárolóba (`localStorage`) valamint szinkronizálja a felhőbe.
4. **Firestore biztonsági szabályok**: A `firestore.rules` élesítve (`deploy_firebase`) a valós Firestore adatbázishoz.

---

## 2. Hiba: Feleslegesen ismétlődő gombok a felületen (Button Duplication Clutter)

### Hibajelenség
A felhasználó jelezte: *"Minden gomb egyszer szerepeljen"*, *"A gyors kitoltes elég ha 1 helyen szerepel"*. A korábbi felületen a „Heti gyorskitöltés” gomb egyszerre 4 különböző helyen volt látható:
- A felső fő műveletsávban (Quick Action Bar)
- A táblázatos nézet fejlécében (`FamilyMatrixTable.tsx`)
- A heti nézet fejlécében (`WeeklyView.tsx`)
- A havi nézet nap részletező felugró ablakában (`MonthlyView.tsx`)
Ráadásul a felső sávban egymás mellett szerepelt a „Heti gyorskitöltés” és a „Napi munkaidő” gomb is, miközben mindkettő ugyanazt a modális ablakot nyitotta meg.

### Kiváltó ok (Root Cause)
Túltervezett, redundáns gyorsgombok beillesztése több részegységbe, ami rontotta az átláthatóságot és megzavarta az egyszerű MVP felhasználói élményt.

### Megoldás és Javítás
1. **Egyetlen, központi hely**: A „⚡ Heti gyorskitöltés” gomb KIZÁRÓLAG a felső fő műveletsávban szerepel.
2. **Felesleges duplikációk eltávolítása**:
   - Eltávolítva a `FamilyMatrixTable.tsx` belső fejlécéből.
   - Eltávolítva a `WeeklyView.tsx` belső fejlécéből.
   - Eltávolítva a `MonthlyView.tsx` nap-részletező ablakának aljából.
   - Eltávolítva a redundáns „Napi munkaidő” gomb a felső sávról (mivel bármely napra kattintva közvetlenül elérhető a munkaidő beállítása).
3. **Végeredmény**: Tiszta, letisztult, minimalista és áttekinthető MVP felület, ahol minden funkciónak pontosan 1 dedikált helye van.

---

## 3. Hiba: Folyamatosan pörgő oldalfrissítés / szinkronizáció ikon (Infinite Sync Loop & Spinning Refresh Icon)

### Hibajelenség
A fejlécben található szinkronizáció / frissítés ikon (`RefreshCw`) folyamatosan, megállás nélkül pörgött (`animate-spin`), a felirat állandóan „Frissítés...”-t mutatott. A felhasználói kérés:
> *"az oldal frissítés funciót ellenőrid, mert folyamatosan pörög. Amikor valaki módosítást hajt végre elég ha akkor frissül az oldal. Vagy ha egyszerűbb megoldani akkor elég 10 másodpercenként ha frissül automatikusan. Oldd meg a lehető legegyszerűbben"*

### Kiváltó okok (Root Causes)
1. **Kölcsönös végtelen szinkronizációs hurok (Feedback Loop)**:
   - Az `App.tsx`-ben létezett egy valós idejű Firestore figyelő (`subscribeToFamilyData`), amely minden adatváltozáskor lefutott és meghívta a `setEvents(incoming.events)` és `setShifts(incoming.shifts)` metódusokat.
   - Ugyanakkor létezett egy `useEffect([events, shifts, memberNames])` hook is, ami minden helyi állapotváltozásra meghívta a `setSyncStatus('syncing')` állapotot, majd 400ms után beküldte a felhőbe az adatokat (`pushFamilyData`).
   - A `pushFamilyData` felhőbe írása azonnal újra aktiválta a valós idejű figyelőt (`subscribeToFamilyData`), amely új referencia-tömbökkel újra beállította a `setEvents`-et, ami újra aktiválta az `useEffect`-et.
   - Ennek következtében a szinkronizációs folyamat 400 ezredmásodpercenként újraindult a végtelenségig, így a `syncStatus` soha nem tudott tartósan `'synced'` állapotban maradni, az ikon pedig folyamatosan pörgött.
2. **Kezdeti betöltési állapot beragadás**:
   - A kezdeti állapot `useState('syncing')` volt, és bizonyos mentési ágakban a hibakezelés nem állította vissza a `'synced'` állapotot.

### Megoldás és Javítás (A lehető legegyszerűbb architektúra)
1. **Végtelen hurok megszüntetése**:
   - Eltávolítottuk az önmagát visszacsatoló `useEffect([events, shifts])` figyelőt és az állandóan visszatüzelő valós idejű WebSocket hallgatót.
2. **Eseményvezérelt azonnali mentés (User-driven sync)**:
   - Létrehoztunk egy dedikált `triggerCloudSync()` központi függvényt.
   - Ez a függvény **kizárólag akkor fut le**, amikor a felhasználó ténylegesen módosítást végez:
     - Új esemény mentése vagy módosítása (`handleSaveEvent`, `handleSaveBatchEvents`)
     - Esemény törlése (`handleDeleteEvent`) vagy pipa állapot váltása (`handleToggleEventCompleted`)
     - Műszak mentése (`handleSaveShift`) vagy törlése (`handleDeleteShift`)
     - Heti gyorskitöltés alkalmazása (`handleBatchApplyShifts`)
     - Családtag nevének átírása (`handleUpdateMemberName`)
     - Naptáradat importálása (`handleImportCalendarData`, `handleImportJson`)
   - Módosításkor a mentés azonnal megtörténik a háttérben, az állapot átvált `'syncing'`-re (röviden jelzi a mentést), majd 350ms múlva automatikusan és stabilan visszaáll `'synced'` állapotba, és a forgás leáll.
3. **10 másodperces diszkrét automatikus háttér-frissítés**:
   - A felhasználó kérésének megfelelően bevezettünk egy pontosan 10 másodperces időzítőt (`setInterval(..., 10000)`).
   - Ez a háttérben, csendben ellenőrzi, hogy egy másik eszközről (pl. feleség telefonja) érkezett-e újabb módosítás (`updatedAt > lastServerTimestampRef.current`).
   - Ha van frissebb adat, csendesen betölti a helyi naptárba, anélkül hogy a felhasználó képernyőjén zavaróan pörgetné az ikont.
4. **Kézi frissítés gomb**:
   - A felső sávban található „Frissítés” gombra kattintva a felhasználó bármikor azonnal lekérheti a legfrissebb felhőadatokat; az ikon ilyenkor kb. 400ms-ig forog, majd zöldre vált és leáll.
5. **Végeredmény**:
   - Az oldalfrissítés/szinkronizáció ikon **NEM pörög folyamatosan**.
   - Nyugalmi állapotban diszkrét, statikus zöld állapotot mutat.
   - Módosításkor azonnal ment, 10 másodpercenként pedig automatikusan frissül a felhőből.


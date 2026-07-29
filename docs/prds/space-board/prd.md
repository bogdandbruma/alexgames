# Space Board — Product Requirements Document (PRD)

**Versiune:** 0.1 (grilling 2026-07-29)  
**Repo:** `demo` — există prototip (`src/game/board.ts`, `src/games/space-board/SpaceBoardGame.tsx`) cu 20 camere și zar 3D.  
**Issues (vertical slices):** [issues/](issues/)

---

## 1. Vision

Joc de tablă digital **2–4 jucători** pe o stație spațială cu **67 camere**. Progresul e pe **index de cameră 1–67** (zar 1–6). Harta **3D arată ca un labirint** (ramuri, insule, poduri), nu ca un șarpe linear.

**Obiectiv:** primul jucător care ajunge la **camera 67** (Luna) oprește jocul pentru toți și primește secvența de **victorie** (rachetă, cer, artificii). Restul jucătorilor văd cinematic-ul.

**Monedă:** banuti (monedă galbenă desenată). Folosiți la **magazine** și **scăpare din capcane**. După ultimul magazin relevant (**53**), banii au sens mai mic (inventar, trivia rămasă, capcane).

---

## 2. Reguli de tur

| Regulă | Detaliu |
|--------|---------|
| Jucători | 2–4 (uman + opțional AI, ca în prototip) |
| Mișcare | Zar 1–6; poziția = index cameră pe **traseul principal** (vezi §4); camera 67 cere landing exact |
| Ordine | Rând pe rând |
| Victorie | Ajungere fix la **67** → `gameOver`, toți stop; mutările care ar depăși 67 nu se aplică |
| Inventar | Max **3** iteme din magazin |
| Item activ / tur | **1** item de tip acțiune: pistol, gheara, steluta, sageata, bomba (momentul: după mișcare, unde e cazul) |
| Anulare trivia | La apariția întrebării; **nu** consumă slotul „1 item/tur” pentru cele 5 de mai sus (separat) |
| x2 zar / x3 bani | „Armare” în inventar; x2 se aplică la **următorul zar**, x3 doar la următorul `coinsOnEnter` |
| Balans banuti | Minim **0**; niciodată negativ |
| Magazin | Nu poți cumpăra dacă nu ai suficienți banuti |
| Magazin vizită | Max **1** obiect per intrare în cameră de magazin |
| Stoc magazin | Fiecare item: **1 exemplar global**; primul cumpărător ia itemul, apoi dispare din toate magazinele |

---

## 3. Portale (landing exact)

Teleportul se verifică după **orice** schimbare de poziție (zar, item, mystery, bomba, etc.): dacă `position === from`, aplică jump la `to` și acțiunea camerei de **destinație**.

Camera-sursă de portal este **doar portal**: nu dă trivia, shop, mystery sau banuti. După teleport, se rezolvă camera de destinație normal (bani dacă are `coinsOnEnter`, sau acțiunea ei).

| De la | La | Notă |
|-------|-----|------|
| 22 | 28 | Shortcut; dacă overshoot de la 21 → 23+, **nu** se activează |
| 35 | 42 | „Sus” în zona trivia |
| 45 | 38 | „Jos” în zona trivia |
| 60 | 50 | Înapoi în zona provocărilor |

**Regulă 22 (confirmată):** exact pe **22** → 28; zar care te duce pe **23** (treci de 22) → rămâi pe 23, acțiune 23.

---

## 4. Traseu și labirint 3D

### 4.1 Traseu principal (logic)

`1 → 2 → … → 21 → (22 sau 23–27) → 28 → 29 → 30 → 31 → 32 → … → 50 → 51 → … → 67`

- Ramura **23–27:** accesibilă doar prin **overshoot** peste 22 (de ex. de pe 21 cu zar 2 → 23). După **27** → **28** (reconectare la traseu principal).
- Zarul **nu** cere alegeri de ramură la click; ramura e rezultatul matematic al poziției.

### 4.2 Layout vizual (recomandare adoptată)

- **3 insule** + poduri:
  1. **Start:** 1–21 + ramura laterală 23–27  
  2. **Mijloc:** 28–50 (trivia), portale 35/45  
  3. **Lună:** 51–67 (capcane, shop 53, mystery 56)  
- **Mini-hartă 2D:** traseu principal, ramura, iconuri shop / mystery / portal / capcană / trivia.

### 4.3 Configurare camere (cerință produs)

Fiecare cameră configurabilă ușor:

- `id` (1–67)  
- `coinsOnEnter` (0–6)  
- `action`: `none | coins | shop | mystery | trivia | portal | trap | finish`  
- o cameră are o singură acțiune; excepția este efectul de destinație al portalului, care rezolvă camera `to`  
- metadata portal (from/to dacă e cazul)  
- decor / accent (existent în `RoomDefinition`)

---

## 5. Tabel camere (economie și acțiuni)

Regulă de configurare: camerele sunt **exclusive** ca acțiune. O cameră este doar `coins`, doar `shop`, doar `mystery`, doar `trivia`, doar `portal`, doar `trap` sau doar `finish`. Dacă o cameră este `mystery`, nu primește și banuti la intrare. În zona trivia nu există `coinsOnEnter`; banutii se câștigă/pierd doar din răspuns.

### 5.1 Start și magazin 1

| Camere | Banuti la intrare | Acțiune |
|--------|-------------------|---------|
| 1 | 0 | coins |
| 2–12 | 2 | coins |
| 13 | 0 | **shop** |
| 14–21 | 2 | coins |
| 22 | 0 | **portal** → 28 |
| 23–27 | 3 | coins |
| 28 | 0 | **shop** |
| 29 | 0 | **mystery** |
| 30–31 | 6 | coins |

### 5.2 Mystery zones

| Cameră | Acțiune |
|--------|---------|
| 17 | **mystery** |
| 24 | **mystery** |
| 29 | **mystery** |
| 39 | **mystery** |
| 41 | **mystery** |
| 54 | **mystery** |
| 56 | **mystery** |

La intrare: UI cărți (shuffle + flip); efect **instant** pe loc + animație.

### 5.3 Zona trivia

| Camere | Banuti la intrare | Acțiune |
|--------|-------------------|---------|
| 32–33, 36–38, 40, 42, 44, 46–47, 49–50 | 0 | **trivia** (doar întrebare; ±1 la răspuns) |
| 34, 43 | 1 | **coins** |
| 39 | 0 | **mystery** |
| 48 | 0 | **shop** |

Portale în zonă: **35→42**, **45→38**.

### 5.4 Drum spre Lună (51–66)

Economie mică (banii conteză înainte de / la shop 53):

| Cameră | Banuti | Acțiune |
|--------|--------|---------|
| 51 | 1 | coins |
| 52 | 0 | **trap** |
| 53 | 0 | **shop** |
| 54 | 0 | **mystery** |
| 55 | 0 | **trap** |
| 56 | 0 | **mystery** |
| 57 | 1 | coins |
| 58 | 0 | **trap** |
| 59 | 1 | coins |
| 60 | 0 | **portal** → 50 |
| 61 | 1 | coins |
| 62 | 2 | coins |
| 63 | 1 | coins |
| 64 | 2 | coins |
| 65 | 0 | **trap** |
| 66 | 0 | **trap** |

### 5.5 Finisaj

| Cameră | Banuti | Acțiune |
|--------|--------|---------|
| 67 | 0 | **finish** (victorie + cinematic) |

---

## 6. Capcane

**Camere:** 52, 55, 58, 65, 66.

**La intrare (prima dată pe capcană în acea „ședere”):** marchează jucător ca **blocat** pentru **următorul** tur; animație (lanțuri / gravitație / cârlig spațial).

**Tur blocat:**

- Nu zar, nu iteme de mutare (pistol, gheara, etc.).  
- Tur consumat automat **sau** scăpare:

| Scăpare | Cost / acțiune |
|---------|----------------|
| Banuti | La **startul** turului blocat: **−10 banuti** (dacă ai &lt; 10, nu poți); apoi tur normal |
| Cheie cosmică | Item din inventar; consumat; tur normal |

Capcana **nu** se re-activează în fiecare tur; doar la nouă intrare pe cameră-capcană.

**Notă design:** capcanele la **65** și **66** creează tensiune înainte de 67 (exact landing).

Mutările înapoi (bomba, gheara, magnet etc.) se opresc la **1**; poziția nu poate coborî sub start.

---

## 7. Magazin

**Camere:** 13, 28, 48, 53.

Toate cele 9 iteme apar în toate magazinele cât timp nu au fost cumpărate. Stocul este global: un item cumpărat o dată nu mai poate fi cumpărat de nimeni, în niciun magazin.

### 7.1 UX

- Jucătorul activ vede overlay **„în magazin”** (nu doar toast).  
- Listă iteme cu **icon + cost** (config ușor de schimbat).  
- Max **1** cumpărare per vizită.  
- Animație la cumpărare.  
- Item lipsă din stoc: raft vizual gol.

### 7.2 Catalog iteme (cost inițial)

| ID | Nume | Cost | Efect | Instant la buy? |
|----|------|------|--------|-----------------|
| `claw` | Gheara | 9 | Trage un jucător alecat **3** pași înapoi | Nu — inventar |
| `star` | Steluta | 7 | **+8** pași înainte pe tine | Nu |
| `swap-arrow` | Sageata de schimb | 14 | Schimbă poziție cu un jucător alecat | Nu |
| `dice-x2` | x2 zar | 5 | Următorul zar ×2 | Nu (armare) |
| `coins-x3` | x3 bani | 5 | Următorul `coinsOnEnter` ×3 | Nu (armare) |
| `trivia-cancel` | Anulare trivia | 3 | Skip întrebare trivia (fără ±1) | Nu |
| `bomb` | Bomba | 6 | Toți ceilalți **−6** pași (nu tu) | Nu |
| `pistol` | Pistol | 1 | Un jucător alecat **+1** pas înainte | Nu |
| `cosmic-key` | Cheie cosmică | 6 | Scăpare din capcană (tur blocat) | Nu |

**Config:** `items.json` sau `shop-catalog.ts` — `id`, `name`, `cost`, `icon`, `effectKey`, `stock: 1`.

**AI shop:** AI joacă magazinul ca un jucător normal, cu strategie random: dacă are cel puțin un item disponibil pe care și-l permite și are slot liber în inventar, cumpără direct un item random dintre opțiunile valide.

---

## 8. Mystery box

**Efecte (instant, animație pe loc):**

| ID | Efect |
|----|--------|
| `car` | +2 casute înainte |
| `phone` | −2 banuti (min 0) |
| `card` | +5 banuti |
| `rocket` | Avansezi lângă jucătorul din față cel mai apropiat |
| `wand` | Mută jucătorii random între ei și cu tine |
| `magnet` | Te trage înapoi lângă jucătorul de după (dacă ești ultimul, stai pe loc) |

**UX:** 3–5 carduri vizuale, shuffle, jucătorul apasă **un** card → reveal + animație.  
**Config:** `mystery-deck.ts` — listă efecte ponderate (opțional).

**Scăpare capcană:** **nu** prin mystery (decizie grilling); doar banuti 10 sau Cheie cosmică.

---

## 9. Trivia (spațiu)

- **200** întrebări, fiecare cu **2** variante (una corectă, una greșită).  
- La intrare pe 32–50: întrebare **aleatoare**.  
- **Corect:** +1 banut.  
- **Greșit:** −1 banut (min 0).  
- **Anulare trivia** (item): nu apare întrebarea, nu ±1.  
- **Opțional (v2):** timer 15s pentru bonus mic — din lista de sugestii, neimplementat în v1.

**Public țintă content:** copii **8–12 ani** — întrebări despre Sistemul Solar, Lună, astronauți, stele și fapte ușor de înțeles (limba română).

**Lista completă (200 întrebări):** [content/trivia-space.json](../../../content/trivia-space.json)

**Format fișier:** `id`, `question`, `correct`, `wrong` (sau `options[]` + `correctIndex` în implementare).

---

## 10. Finisaj camera 67

1. Joc oprit pentru toți.  
2. Cinematic winner: avatar în **rachetă** de pe **Luna**, decolare, plimbare pe cer, **artificii** de succes.  
3. Spectatori: overlay sau cameră partajată (v2: split).  
4. Buton rematch / lobby.

---

## 11. Interactivitate (backlog aprobat + sugestii)

**Adoptat în design:**

- Mini-hartă 2D cu toți jucătorii și iconuri de cameră.  
- Portale cu tunel vizual scurt (nu teleport sec).  
- Shop cu raft gol după vânzare.  
- Mystery cu animație cărți.

**Sugestii pentru v2:**

- Emoji / reacții pe avatar când ești target.  
- Combo vizual x3 bani + cameră cu mulți banuti.  
- Timer trivia cu bonus.  
- Tur rapid AI pentru shop/mystery.  
- Cinematic split pentru non-winners.

---

## 12. Cerințe tehnice (aliniere cod existent)

| Zonă | Fișier / direcție |
|------|-------------------|
| Camere 67 + graf | Extinde `board.ts` sau `space-board/rooms.generated.ts` + `roomConnections` non-secvențial pentru vizual |
| Stare joc | `store.ts`: coins, inventory, trapped, armed buffs (x2/x3), shop stock per room, phase |
| Faze tur | `roll` → `move` → `resolveRoom` → `portal?` → `trap?` → `shop/mystery/trivia UI` → `endTurn` |
| UI | `SpaceBoardGame.tsx`: overlays shop, mystery, trivia, minimap |
| 3D | `GameScene.tsx`: 67 layout, decor per zonă |
| Content | trivia JSON, shop catalog, mystery deck |

**Principii config:**

- Cost și icon item: un singur catalog.  
- Cameră: `RoomGameplayConfig` separat de mesh/decor (`accentColor`, `shape`).

---

## 13. Plan de implementare

### Faza 0 — Documentație și content shell

- [x] `content/trivia-space.json` (200 întrebări — [listă](../../../content/trivia-space.json))  
- [ ] `shop-catalog.ts`, `mystery-deck.ts`, `rooms-gameplay.ts` (67 rânduri)

### Faza 1 — Core loop 67

- [ ] Extindere store: coins, poziție, tur, game over la 67  
- [ ] Landing exact la 67: zarul/itemul care depășește 67 nu mută jucătorul peste finish  
- [ ] Tabel camere: coins on enter, fără shop/mystery încă  
- [ ] Portale exact landing + ramura 23–27 → 28  
- [ ] Zar + mișcare + AI simplu

### Faza 2 — Capcane și economie

- [ ] Trap state + tur blocat + scăpare 10 / Cheie cosmică  
- [ ] Inventar max 3, folosire iteme mutare + portal re-check

### Faza 3 — Trivia

- [ ] UI 2 opțiuni, random din pool, ±1, anulare  
- [ ] Zona 32–50

### Faza 4 — Magazin

- [ ] UI magazin fullscreen, stoc 1, 1 buy/visit, animație  
- [ ] Catalog 9 iteme + efecte (gheara, bomba, …)

### Faza 5 — Mystery

- [ ] UI cărți + 6 efecte + animații  
- [ ] Camere 17, 24, 41, 56

### Faza 6 — Labirint 3D + mini-hartă

- [ ] Layout 3 insule, 67 camere vizuale  
- [ ] Mini-hartă 2D  
- [ ] Tunel portale

### Faza 7 — Victorie

- [ ] Secvență 67: rachetă, lună, cer, artificii  
- [ ] Screen game over

### Faza 8 — Polish

- [ ] Sunete, toast-uri RO, balans costuri  
- [ ] Teste unitare: portale, overshoot 22, trap escape, x2/x3 timing

---

## 14. Decizii încheiate (ADR light)

| Decizie | Motiv |
|---------|--------|
| Index linear 1–67 + graf vizual | Reguli simple, labirint la prezentare |
| Portale doar exact landing | Evită frustrarea overshoot-ului accidental |
| Banuti min 0 | Copii, claritate UI |
| 1 item acțiune / tur | Reduce combo haos |
| Mystery fără scăpare capcană | Mai simplu decât A+B+cheie+mystery |
| Stop global la 67 | Focus pe „cursa” către Lună |
| Landing exact la 67 | Tensiune pe final, mai ales cu capcanele 65/66 |
| O singură acțiune per cameră | Config clar: doar coins/shop/mystery/trivia/portal/trap/finish |
| Stoc item global | Un item cumpărat dispare din toate magazinele |
| x3 bani doar pe `coinsOnEnter` | Nu afectează trivia sau mystery, deci economia rămâne previzibilă |
| AI random strategic | Cumpără direct un item random valid când poate |

---

## 15. Deschis / de definit ulterior

- Efecte exacte „rocket / wand / magnet” (ordine pași, coliziune pe aceeași cameră).  
- Ponderare mystery deck.  
- Localizare EN dacă e nevoie.  
- Mystery zones: teme vizuale per cameră.

---

*Generat după sesiunea de grilling; recomandare labirint „automat” (fără alegere ramură) adoptată.*

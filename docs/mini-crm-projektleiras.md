# Mini CRM személyes megkeresésekhez

## 1. Projektötlet röviden

A **Mini CRM** egy könnyű, egyszerűen használható ügyfél- és kapcsolatkezelő webalkalmazás, amely elsősorban személyes és direkt üzleti megkeresések követésére szolgál.

Az alkalmazás segítségével nyilvántarthatók:

- cégek;
- kapcsolattartók;
- személyes, LinkedIn-, e-mail- és telefonos interakciók;
- kapcsolati státuszok;
- következő utánkövetési időpontok;
- rövid megjegyzések és teendők.

A projekt célja egy néhány óra alatt elkészíthető, működő CRUD-alkalmazás létrehozása, amely alkalmas az agent-alapú fejlesztési folyamat bemutatására Claude Code használatával.

---

## 2. A megoldandó probléma

Személyes kapcsolatépítés, értékesítés vagy üzleti fejlesztés során könnyen elveszhet, hogy:

- kivel vettük már fel a kapcsolatot;
- milyen csatornán történt a megkeresés;
- mit beszéltünk meg;
- mikor kell újra jelentkezni;
- melyik kapcsolat milyen értékesítési vagy együttműködési fázisban van.

A Mini CRM célja, hogy ezt egy egyszerű, áttekinthető felületen kezelje, felesleges enterprise CRM-funkciók nélkül.

---

## 3. Célfelhasználók

Az első verzió célfelhasználói:

- kisvállalkozások vezetői;
- tanácsadók;
- értékesítők;
- üzletfejlesztési szakemberek;
- recruiter vagy partnerkapcsolati munkatársak;
- olyan csapatok, amelyek LinkedInen, e-mailben vagy személyesen építenek üzleti kapcsolatokat.

---

## 4. MVP célja

Az első verzióban a felhasználó képes legyen:

1. cégeket létrehozni és kezelni;
2. kapcsolattartókat cégekhez rendelni;
3. interakciókat rögzíteni;
4. a kapcsolat státuszát módosítani;
5. következő utánkövetési dátumot beállítani;
6. a kapcsolatokat keresni és szűrni;
7. a közelgő utánkövetéseket egy dashboardon látni.

---

## 5. Fő entitások

### 5.1. Company

Egy szervezet vagy vállalkozás, amelyhez egy vagy több kapcsolattartó tartozhat.

#### Mezők

| Mező | Típus | Kötelező | Leírás |
|---|---|---:|---|
| `id` | UUID / integer | igen | Egyedi azonosító |
| `name` | string | igen | Cég neve |
| `website` | string | nem | Weboldal címe |
| `industry` | string | nem | Iparág |
| `notes` | text | nem | Általános megjegyzés |
| `created_at` | datetime | igen | Létrehozás ideje |
| `updated_at` | datetime | igen | Utolsó módosítás ideje |

---

### 5.2. Contact

Egy személy, akivel üzleti kapcsolatot tartunk fenn.

#### Mezők

| Mező | Típus | Kötelező | Leírás |
|---|---|---:|---|
| `id` | UUID / integer | igen | Egyedi azonosító |
| `company_id` | foreign key | nem | Kapcsolódó cég |
| `name` | string | igen | Kapcsolattartó neve |
| `job_title` | string | nem | Beosztás |
| `email` | string | nem | E-mail-cím |
| `phone` | string | nem | Telefonszám |
| `linkedin_url` | string | nem | LinkedIn-profil |
| `status` | enum / string | igen | Aktuális kapcsolati státusz |
| `next_follow_up_at` | datetime | nem | Következő utánkövetés |
| `notes` | text | nem | Általános megjegyzés |
| `created_at` | datetime | igen | Létrehozás ideje |
| `updated_at` | datetime | igen | Utolsó módosítás ideje |

#### Javasolt státuszok

- `new` – új kapcsolat;
- `contacted` – megkeresve;
- `replied` – válaszolt;
- `meeting_scheduled` – meeting egyeztetve;
- `in_discussion` – aktív egyeztetés;
- `won` – sikeres együttműködés;
- `lost` – lezárt, sikertelen;
- `on_hold` – későbbre halasztva.

---

### 5.3. Interaction

Egy kapcsolattartóval történt kommunikáció vagy esemény.

#### Mezők

| Mező | Típus | Kötelező | Leírás |
|---|---|---:|---|
| `id` | UUID / integer | igen | Egyedi azonosító |
| `contact_id` | foreign key | igen | Kapcsolódó személy |
| `type` | enum / string | igen | Interakció típusa |
| `subject` | string | nem | Rövid cím |
| `notes` | text | igen | Mi történt |
| `happened_at` | datetime | igen | Interakció időpontja |
| `created_at` | datetime | igen | Rögzítés ideje |

#### Javasolt interakciótípusok

- `linkedin_message`;
- `email`;
- `phone_call`;
- `meeting`;
- `event`;
- `note`;
- `other`.

---

## 6. Kapcsolatok az adatmodellben

```text
Company 1 ──── N Contact
Contact 1 ──── N Interaction
```

Egy céghez több kapcsolattartó tartozhat.

Egy kapcsolattartóhoz több interakció kapcsolódhat.

A kapcsolattartó cég nélkül is létrehozható, például akkor, ha még nem ismert a szervezete.

---

## 7. CRUD műveletek

### 7.1. Company CRUD

- új cég létrehozása;
- cégek listázása;
- cég adatlapjának megnyitása;
- cég adatainak szerkesztése;
- cég törlése;
- céghez tartozó kapcsolattartók megjelenítése.

### 7.2. Contact CRUD

- új kapcsolattartó létrehozása;
- kapcsolattartók listázása;
- kapcsolattartó részletes adatlapja;
- kapcsolattartó adatainak szerkesztése;
- kapcsolattartó törlése;
- státusz módosítása;
- következő utánkövetési dátum beállítása.

### 7.3. Interaction CRUD

- új interakció rögzítése;
- interakciók időrendi listázása;
- interakció szerkesztése;
- interakció törlése.

Az MVP-ben az interakció szerkesztése akár el is hagyható, ha a projekt időkerete szűk.

---

## 8. Fő oldalak

### 8.1. Dashboard

A kezdőoldal a legfontosabb napi információkat mutatja.

#### Kártyák

- összes aktív kapcsolat;
- új kapcsolatok száma;
- ezen a héten esedékes utánkövetések;
- elmaradt utánkövetések;
- aktív egyeztetések.

#### Listák

- következő utánkövetések;
- legutóbbi interakciók;
- válaszra váró kapcsolatok.

---

### 8.2. Kapcsolattartók listája

#### Funkciók

- keresés név, cég vagy e-mail alapján;
- szűrés státusz szerint;
- szűrés cég szerint;
- szűrés utánkövetési dátum szerint;
- rendezés utolsó módosítás vagy következő utánkövetés alapján.

#### Javasolt oszlopok

| Név | Cég | Beosztás | Státusz | Következő utánkövetés | Műveletek |
|---|---|---|---|---|---|

---

### 8.3. Új kapcsolattartó

Egyszerű űrlap az alábbi mezőkkel:

- név;
- cég;
- beosztás;
- e-mail;
- telefon;
- LinkedIn URL;
- státusz;
- következő utánkövetés;
- megjegyzés.

---

### 8.4. Kapcsolattartó adatlap

Az oldal tartalma:

- alapadatok;
- kapcsolódó cég;
- aktuális státusz;
- következő utánkövetés;
- általános megjegyzés;
- interakciók idővonala;
- új interakció rögzítése;
- szerkesztés és törlés.

---

### 8.5. Cégek listája

A cégek név, iparág és kapcsolattartók száma alapján jelennek meg.

#### Javasolt oszlopok

| Cégnév | Iparág | Kapcsolattartók száma | Weboldal | Műveletek |
|---|---|---:|---|---|

---

### 8.6. Cég adatlap

Az oldal tartalma:

- cégnév;
- weboldal;
- iparág;
- megjegyzés;
- a céghez tartozó kapcsolattartók;
- új kapcsolattartó létrehozása az adott céghez.

---

## 9. Fő felhasználói folyamat

### Új kapcsolat rögzítése

1. A felhasználó megnyitja az új kapcsolattartó űrlapot.
2. Kiválaszt egy meglévő céget, vagy létrehoz egy újat.
3. Megadja a kapcsolattartó alapadatait.
4. Beállítja a státuszt `new` értékre.
5. Elmenti a rekordot.

### Első megkeresés rögzítése

1. A felhasználó megnyitja a kapcsolattartó adatlapját.
2. Új interakciót rögzít `linkedin_message` vagy `email` típussal.
3. A státuszt `contacted` értékre módosítja.
4. Beállítja a következő utánkövetési dátumot.

### Válasz és meeting kezelése

1. Új interakció kerül rögzítésre.
2. A státusz `replied`, majd `meeting_scheduled` lesz.
3. A meeting után újabb megjegyzés vagy interakció kerül az idővonalra.
4. A kapcsolat lezárható `won`, `lost` vagy `on_hold` státusszal.

---

## 10. Keresés és szűrés

Az MVP-ben legalább az alábbi funkciók készüljenek el:

- szabad szöveges keresés kapcsolattartó nevére;
- szűrés státusz szerint;
- szűrés cég szerint;
- csak elmaradt utánkövetések megjelenítése;
- csak a következő hét utánkövetéseinek megjelenítése.

A keresés történhet szerveroldalon query paraméterekkel.

Példa:

```text
/contacts?search=anna&status=contacted&company=12
```

---

## 11. Validációs szabályok

### Company

- a cégnév kötelező;
- a weboldalnak érvényes URL-nek kell lennie, ha meg van adva.

### Contact

- a név kötelező;
- legalább egy elérhetőség javasolt, de nem feltétlenül kötelező;
- az e-mail-cím formátumát validálni kell;
- a LinkedIn URL-nek érvényes URL-nek kell lennie;
- a státusz csak az előre definiált értékek egyike lehet.

### Interaction

- a kapcsolattartó kötelező;
- az interakció típusa kötelező;
- a megjegyzés nem lehet üres;
- az interakció dátuma kötelező.

---

## 12. Javasolt technológiai stack

### Frontend és backend

- Next.js;
- TypeScript;
- App Router;
- React Server Components;
- Server Actions vagy REST API route-ok;
- Tailwind CSS;
- shadcn/ui.

### Adatbázis

Gyors helyi fejlesztéshez:

- SQLite;
- Prisma ORM vagy Drizzle ORM.

Publikus demóhoz:

- PostgreSQL;
- Neon vagy Supabase.

### Validáció

- Zod;
- React Hook Form.

### Deployment

- Vercel;
- Neon PostgreSQL vagy Supabase PostgreSQL.

---

## 13. Javasolt projektstruktúra

```text
app/
  dashboard/
    page.tsx
  contacts/
    page.tsx
    new/
      page.tsx
    [id]/
      page.tsx
      edit/
        page.tsx
  companies/
    page.tsx
    new/
      page.tsx
    [id]/
      page.tsx
  api/
    contacts/
    companies/
    interactions/

components/
  contacts/
  companies/
  interactions/
  dashboard/
  ui/

lib/
  db.ts
  validations.ts
  queries.ts
  actions.ts

prisma/
  schema.prisma
  seed.ts
```

---

## 14. Példa Prisma adatmodell

```prisma
model Company {
  id        Int       @id @default(autoincrement())
  name      String
  website   String?
  industry  String?
  notes     String?
  contacts  Contact[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model Contact {
  id             Int           @id @default(autoincrement())
  companyId      Int?
  company        Company?      @relation(fields: [companyId], references: [id])
  name           String
  jobTitle       String?
  email          String?
  phone          String?
  linkedinUrl    String?
  status         ContactStatus @default(NEW)
  nextFollowUpAt DateTime?
  notes          String?
  interactions   Interaction[]
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
}

model Interaction {
  id         Int             @id @default(autoincrement())
  contactId  Int
  contact    Contact         @relation(fields: [contactId], references: [id], onDelete: Cascade)
  type       InteractionType
  subject    String?
  notes      String
  happenedAt DateTime
  createdAt  DateTime        @default(now())
}

enum ContactStatus {
  NEW
  CONTACTED
  REPLIED
  MEETING_SCHEDULED
  IN_DISCUSSION
  WON
  LOST
  ON_HOLD
}

enum InteractionType {
  LINKEDIN_MESSAGE
  EMAIL
  PHONE_CALL
  MEETING
  EVENT
  NOTE
  OTHER
}
```

---

## 15. Seed adatok

A projekt indulásakor érdemes néhány mintaadatot létrehozni.

### Példa cégek

- Acme Logistics;
- GreenTech Solutions;
- Northstar Consulting.

### Példa kapcsolattartók

- Anna Kovács – Operations Director;
- Péter Nagy – CEO;
- Júlia Tóth – HR Manager.

### Példa interakciók

- LinkedIn kapcsolatfelvétel;
- bemutatkozó e-mail;
- 30 perces online meeting;
- utánkövetési megjegyzés.

---

## 16. MVP acceptance criteria

A projekt akkor tekinthető elkészültnek, ha:

- létrehozható, megtekinthető, szerkeszthető és törölhető cég;
- létrehozható, megtekinthető, szerkeszthető és törölhető kapcsolattartó;
- egy kapcsolattartó céghez rendelhető;
- egy kapcsolattartóhoz interakció rögzíthető;
- a kapcsolattartó státusza módosítható;
- következő utánkövetési dátum beállítható;
- a kapcsolattartók név és státusz alapján szűrhetők;
- a dashboard mutatja a közelgő és elmaradt utánkövetéseket;
- az űrlapok hibás adatok esetén érthető validációs üzenetet adnak;
- az adatbázis seed paranccsal feltölthető mintaadatokkal;
- az alkalmazás lokálisan és deployolt környezetben is fut.

---

## 17. Tudatosan kihagyott funkciók az első verzióból

Az MVP ne tartalmazza:

- többfelhasználós jogosultságkezelést;
- Google- vagy Microsoft-bejelentkezést;
- automatikus e-mail-küldést;
- LinkedIn-integrációt;
- teljes sales pipeline-t;
- deal- és ajánlatkezelést;
- kampánykezelést;
- fájlfeltöltést;
- AI-asszisztenst;
- összetett riportokat;
- audit logot.

Ezek a későbbi iterációk részei lehetnek.

---

## 18. Lehetséges második iteráció

A következő verzióban hozzáadható:

- címkék a kapcsolattartókhoz;
- feladatok és emlékeztetők;
- Kanban nézet státusz szerint;
- CSV import és export;
- interakciók szerkesztése;
- tömeges státuszmódosítás;
- felhasználói bejelentkezés;
- csapattaghoz rendelés;
- egyszerű pipeline;
- e-mail sablonok;
- AI-alapú interakció-összefoglalás;
- AI által javasolt következő lépés.

---

## 19. Agent-alapú fejlesztési felosztás

A projekt Claude Code-ban több kisebb feladatra bontható.

### Agent 1 – Projektalapok

- Next.js projekt létrehozása;
- TypeScript és Tailwind konfiguráció;
- shadcn/ui telepítése;
- alap layout és navigáció.

### Agent 2 – Adatbázis

- Prisma vagy Drizzle beállítása;
- adatmodell létrehozása;
- migráció;
- seed script.

### Agent 3 – Company CRUD

- listaoldal;
- létrehozó űrlap;
- részletes oldal;
- szerkesztés;
- törlés.

### Agent 4 – Contact CRUD

- lista és szűrés;
- létrehozó űrlap;
- részletes oldal;
- szerkesztés;
- törlés.

### Agent 5 – Interaction kezelés

- interakció rögzítése;
- idővonal megjelenítése;
- törlés.

### Agent 6 – Dashboard

- statisztikai lekérdezések;
- közelgő utánkövetések;
- elmaradt utánkövetések;
- legutóbbi interakciók.

### Agent 7 – Minőségbiztosítás

- validáció;
- hibakezelés;
- loading és empty state-ek;
- alapvető tesztek;
- accessibility és reszponzivitás ellenőrzése.

---

## 20. Rövid fejlesztési prioritás

Ha csak néhány óra áll rendelkezésre, a sorrend legyen:

1. adatmodell és migráció;
2. seed adatok;
3. kapcsolattartó lista;
4. kapcsolattartó létrehozása;
5. kapcsolattartó szerkesztése és törlése;
6. cégek kezelése;
7. interakció rögzítése;
8. státusz és utánkövetési dátum;
9. egyszerű dashboard;
10. finomhangolás és deploy.

A legfontosabb, hogy az első verzió végig működő vertikális szelet legyen, ne sok félkész funkció.

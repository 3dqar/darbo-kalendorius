# DarboLaikas — techninė specifikacija v1.0

## 1. Paskirtis ir apimtis
Asmeninė Lietuvos darbo pamainų apskaitos aplikacija. Vienas naudotojas; naudojimas telefone ir kompiuteryje. Naudotojas rankiniu būdu įrašo kiekvieno mėnesio valandų normą ir du valandinius tarifus: bruto bei orientacinį neto.

## 2. Pagrindiniai naudotojo scenarijai
1. Pasirinkti mėnesį ir matyti mėnesio kalendorių, dirbtas dienas, valandas, bendrą uždarbį.
2. Įvesti naują darbo vietą: pavadinimą ir neprivalomą adresą. Kitų pamainų metu pasirinkti jau išsaugotą vietą.
3. Pridėti pamainą: datą, darbo vietą, pradžios ir pabaigos laiką, neapmokamos pertraukos minutes.
4. Redaguoti ir ištrinti pamainą (su patvirtinimu).
5. Įrašyti mėnesio normą ir valandinius bruto/neto tarifus.
6. Matyti apmokamą darbo trukmę, keturias atlygio grupes, darbo užmokesčio prognozę.
7. Peržiūrėti ankstesnius mėnesius ir eksportuoti mėnesio pamainas CSV formatu.

## 3. Sąsajos ekranai
- Vienas dashboard su navigacija: suvestinės kortelės, kalendorius, mėnesio tarifai ir norma, valandų pasiskirstymas, pamainų lentelė.
- Pamainos įvedimo / redagavimo modalas.
- Darbo vietos pridėjimo modalas su egzistuojančių vietų sąrašu.
- Mobilus responsyvus išdėstymas (nuo 320 px), kalendorius 7 stulpelių, lentelė su horizontaliu slinkimu.

## 4. Duomenų modelis (Google Sheets)

### `places`
`id (UUID), name, address, active, createdAt, updatedAt`.
Unikalus aktyvios darbo vietos pavadinimas; adresas neprivalomas.

### `shifts`
`id (UUID), date (YYYY-MM-DD), placeId (UUID), start (HH:mm), end (HH:mm), breakMinutes, createdAt, updatedAt`.
Pamainos data yra jos pradžios data; pabaiga ankstesnė už pradžią reiškia perėjimą per vidurnaktį.

### `months`
`month (YYYY-MM), normHours, grossRate, netRate, updatedAt`.
Kiekvieno mėnesio įrašas yra savarankiškas; naujas mėnuo nepanaikina senų.

## 5. Viešos Apps Script RPC funkcijos
- `apiInit(month)` → mėnesio pamainos, darbo vietos, nustatymai ir apskaičiuota suvestinė.
- `apiSavePlace({id?,name,address})` → išsaugota vieta.
- `apiSaveMonth({month,normHours,grossRate,netRate})` → perskaičiuota mėnesio suvestinė.
- `apiSaveShift({id?,date,placeId,start,end,breakMinutes})` → perskaičiuota mėnesio suvestinė.
- `apiDeleteShift(id,month)` → perskaičiuota mėnesio suvestinė.

Rašymo operacijas saugo `LockService`, įvestys tikrinamos serveryje. Visi duomenys skaitomi iš prie skripto pririšto Google Sheets dokumento. Klientas nedirba su Google Sheets API raktais.

## 6. Darbo trukmės ir atlygio taisyklės
- Apmokama trukmė minutėmis = (pabaiga − pradžia + 1440) mod 1440 − pertrauka. 24 valandų ir ilgesnės pamainos v1 nepalaikomos.
- Naktis: 22:00–06:00, koeficientas 1,5.
- Laikas virš pasirinktos mėnesio normos: dieną ×1,5, naktį ×2. Iki normos: dieną ×1, naktį ×1,5.
- Kai pertraukos tikslios valandos nežinomos, jos proporcingai paskirstomos per visas pamainos minutes. Dėl to naktinio darbo paskirstymas yra apytikslis.
- Viršvalandžiai skiriami pagal išrikiuotas pamainas: data, pradžia, ID. Ši mėnesio normos perviršio interpretacija nereiškia automatinio teisinio viršvalandžių pripažinimo.
- Bruto / neto prognozės atskirai gaunamos iš naudotojo įvestų tarifų; mokesčiai neskaičiuojami.
- Bendros sumos apskaičiuojamos iš pilno tikslumo skaičių ir suapvalinamos pateikiant iki euro centų; atskiros lentelės eilutės apvalinamos atskirai, todėl centų suma gali skirtis nuo bendros sumos.

## 7. Patikra prieš naudojimą
- Naujas mėnuo be normos: rodomos išdirbtos valandos, bet atlygio prognozė nepatikima; prieš naudojant įvedami tarifai ir norma.
- Pamaina per vidurnaktį: 20:00–08:00 su 30 min. pertrauka = 11,5 apmokamos valandos.
- 08:00–18:00 be pertraukos su 8 val. norma = 8 val. dieninių + 2 val. preliminarių viršvalandžių.
- Du tą patį mėnesį įvesti įrašai išlieka perkrovus puslapį.
- Darbo vietos pavadinimas ir adresas pasirodo pasirinkimo meniu po pakartotinio atidarymo.
- Spalis → lapkritis → spalis: spalio pamainos nepakinta.
- CSV eksportas turi visas matomas mėnesio pamainas.

## 8. V1 ribos (sąmoningai nerealizuota)
- Lietuviškų mokesčių / NPD skaičiavimas, faktinio algalapio palyginimas.
- Šventinių / poilsio dienų koeficientai, premijos, atostogos, nedarbingumas.
- Tikslios pertraukų pradžios ir pabaigos laikas.
- Pamainos dalijimas tarp kalendorinių mėnesių.
- Tarifų pakeitimas vidury mėnesio.
- Atminties talpykla darbui be interneto, kelių naudotojų paskyros, automatinė kopija.

## 9. Technologijos ir diegimas
Serveris: Google Apps Script V8, pagal dokumentą pririštas (container-bound). Duomenys: Google Sheets. UI: vanilla HTML, CSS, JS Google Apps Script HtmlService. Kodas: GitHub kaip versijų saugykla. Paskelbimas: `Execute as me`, `Who has access = Only myself`. Konkretūs paleidimo žingsniai faile `README.md`.
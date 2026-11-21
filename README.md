# DarboLaikas v1.0 — darbo kalendorius

Privatus lietuviškas darbo kalendorius su mėnesio norma, bruto ir neto prognozėmis, darbo vietų katalogu bei Google Sheets saugojimu. Nereikia mokamo serverio ar tradicinės duomenų bazės.

## Paleidimas (Google Apps Script)

1. Google Drive sukurk **privatų** Google Sheets dokumentą „DarboLaikas“.
2. Dokumente pasirink **Extensions → Apps Script**.
3. Į `Code.gs` įkelk šio projekto `Code.gs` turinį. Tada per `+` → **HTML** sukurk failus **Index**, **Styles** ir **Client**; į kiekvieną įkelk atitinkamų `.html` failų turinį. Prireikus per projekto nustatymus įjunk `appsscript.json` manifestą ir pakeisk jo turinį.
4. **Deploy → New deployment → Web app**. **Execute as: Me** ir **Who has access: Only myself**. Nenaudok „Anyone“ ar „Anyone with Google account“.
5. Spausk **Deploy**, autorizuok Apps Script prieigą prie šio Sheets dokumento ir atverk savo Web App URL. Jei keiti kodą, sukurk naują deployment versiją per **Manage deployments → Edit → New version**.
6. Įvesk mėnesio normą bei bruto ir neto valandinius tarifus, pridėk darbo vietą ir pirmą pamainą.

**Svarbu:** Google Apps Script prieigos pasirinkimai gali priklausyti nuo Google paskyros tipo ir organizacijos taisyklių. Jei „Only myself“ pasiekiamas nėra, neskelbk aplikacijos platesnei auditorijai nepakeitęs autentifikavimo architektūros.

## Pagrindinė struktūra

- `Code.gs` — serverio API, validavimas, Google Sheets lentelės, mėnesio skaičiavimai.
- `Index.html` — pagrindinis UI.
- `Styles.html` — tamsaus prisitaikančio dizaino stiliai.
- `Client.html` — frontend veiksmai ir sinchronizacija su Apps Script.
- `appsscript.json` — Apps Script manifestas.

Sheets lapai sukuriami automatiškai: `places`, `shifts`, `months`. Juose nenaudok atsitiktinių naujų stulpelių prieš esamus laukus.

## Kaip skaičiuoja v1

- Darbo laikas = pabaiga − pradžia (pamainai per vidurnaktį pridedama 24 h) − neapmokama pertrauka.
- Naktinis laikas = 22:00–06:00, ×1,5; virš mėnesio normos ×1,5; naktinis virš normos ×2.
- Virš normos valandos priskiriamos chronologiškai pagal pamainų datą ir pradžią.
- Bruto prognozė = bruto tarifas × apmokėtos valandos × atitinkamas koeficientas.
- Neto prognozė = įvestas neto tarifas × apmokėtos valandos × atitinkamas koeficientas. **Tai nėra Lietuvos GPM, NPD, PSD ir VSD mokestinis skaičiavimas.** Tikras neto gali skirtis.
- Kadangi įvedama tik pertraukos **trukmė**, ne jos pradžia ir pabaiga, pertrauka proporcingai paskirstoma per visą pamainą; naktinių valandų skaičius yra **įvertis**.
- Vieno mėnesio norma yra vartotojo apskaitos taisyklė. Darbdavio suminės apskaitos ar oficialių viršvalandžių nustatymo ji automatiškai neatstoja.
- Švenčių / poilsio dienų specialūs tarifai ir premijos v1 **neįdiegti**. Tokiems mėnesiams atlygio prognozė bus nepilna.
- Mėnesio valandinis tarifas saugomas pagal mėnesį; senų mėnesių tarifai nekeičiami, kol pats jų nepakeiti.

## Duomenų saugumas

- Google Sheets dokumentas turi likti privatus; kodo repozitorijuje **nėra** duomenų dokumento ID, slaptažodžių ar OAuth tokenų.
- API vykdomas susietame Apps Script projekte, o ne per viešą HTML→Sheets endpointą.
- Web App paskelbk **tik sau**; GitHub repo gali būti privatus. Net jei kodas viešas, *jokie asmeniniai Sheets duomenys į jį nekeliami*.
- Pasidaryk periodinę Google Sheets dokumento kopiją.

## Ribojimai ir numatomi v2 papildymai

- Tik viena asmeninė paskyra, viena mėnesio norma, viena darbo valandų tarifo pora per mėnesį.
- Pamainos per vidurnaktį priskiriamos jos pradžios mėnesiui; tikslus mėnesių ribų padalijimas — v2.
- Kol kas nenumatyta kelių pamainų per tą patį laiką dubliavimo kontrolė.
- Švenčių dienų koeficientai, faktinio algalapio palyginimas, tarifų keitimas vidury mėnesio, mobilus offline režimas ir preciziškas pertraukų laikas — v2.
- Aplikacija veikia per Google Apps Script Web App adresą; GitHub čia yra *kodo saugykla*, ne viešas statinis hostingas.
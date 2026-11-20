# CVBuilder v2.5.0 – wersja Google Sites (statyczna)

Statyczna wersja CVBuildera: **same pliki HTML, CSS i JavaScript**, bez serwera
i bez Pythona na komputerze użytkownika. Wystarczy dowolny hosting statyczny
(GitHub Pages, Netlify, Cloudflare Pages, serwer WWW) albo osadzenie w Google
Sites. CV, list motywacyjny i raport ATS powstają w przeglądarce użytkownika.

Wersja desktopowa (`cv_builder.py`, `dist\CVBuilder.exe`) pozostaje nietknięta –
ten katalog jest całkowicie niezależny.

## Adresy publikacji

| Co | Adres |
| --- | --- |
| Aplikacja | https://raminassar-arch.github.io/cvbuilder-web/ |
| Pomocnik osadzania (Google Sites) | https://raminassar-arch.github.io/cvbuilder-web/embed.html |
| Repozytorium | https://github.com/raminassar-arch/cvbuilder-web |

Hosting: GitHub Pages, gałąź `main`, katalog główny (`/`).

---

## Jak to działa

| Warstwa | Plik | Rola |
| --- | --- | --- |
| Interfejs | `index.html`, `styles.css` | ciemny motyw, pełne RTL dla arabskiego, układ responsywny, druk A4 |
| Tłumaczenia | `i18n.js` | EN / PL / AR (ponad 370 kluczy) i funkcja `tr()` z interpolacją |
| Logika | `app.js` | stan i `localStorage`, kreator 10 kroków, edytory zakładek, punktacja ATS, dopasowanie słów kluczowych, import DOCX, pobieranie plików |
| Osadzanie | `embed.html` | pomocnik: gotowy kod iframe dla Google Sites + podgląd |
| Ikona | `favicon.svg` | znak „CV” w zielono-złotej kolorystyce |

Kluczowa decyzja: **wszystko działa po stronie klienta**. Nie ma wywołań API,
analizy zewnętrznej ani pobierania bibliotek z CDN – po pierwszym wczytaniu
aplikacja działa także bez internetu. Dane pozostają w przeglądarce.

---

## Funkcje (zgodność z wersją desktopową)

- Przełączanie **EN / PL / AR** na żywo; interfejs, CV, list motywacyjny i raport
  ATS tłumaczą się natychmiast. Arabski ustawia układ **RTL**.
- **Kreator (Q&A)** z 10 kroków: Wstecz / Dalej, skok do pytania i ekran podsumowania
  oraz **ręczne zakładki** dla każdej sekcji.
- Opcjonalne zdjęcie i 1–2 zdaniowy opis roli (kursywa) nad osiągnięciami.
- Raport ATS: standardowe nagłówki, daty, jakość punktów listy, długość, pokrycie słów
  kluczowych z ogłoszenia oraz wynik 0–100 z listą znalezisk.
- **Styl dokumentu**: czarno-biały, zielono-czarny, różowo-czarny (tylko kolory – bez
  tabel, pól tekstowych i obrazów w tekście, żeby ATS czytał treść poprawnie).
- **Import DOCX** — na **pierwszym ekranie** (wybór trybu) jest trzecia karta
  *Importuj DOCX*, obok kreatora i zakładek. Ten sam przycisk jest też w nagłówku.
  Otwiera panel wewnątrz strony (bez nowego okna): przeciągnij plik `.docx` do pola
  lub wybierz go z dysku, a aplikacja
  sama rozpoznaje dane kontaktowe, sekcje CV, umiejętności, doświadczenie,
  wykształcenie, certyfikaty, projekty i języki. Domyślnie zaznaczone jest
  **Zastąp istniejące pola**; po odznaczeniu puste pola są uzupełniane, a nowe
  wpisy listy dodawane bez usuwania poprzednich. Po imporcie sprawdź pola w
  kreatorze/zakładkach i zapisz profil. Statusy i komunikaty o błędach są
  przetłumaczone na EN/PL/AR. Plik jest analizowany wyłącznie w przeglądarce.
- **Ostatni ekran ma jeden przycisk `Generuj`.** Najpierw wybierasz styl dokumentu,
  potem zaznaczasz format(y): **PDF** i/lub **Word (`.doc`)** – pliki `.txt` nie są
  już oferowane. Po kliknięciu `Generuj` powstają zaznaczone pliki:
  - **Word** – jeden plik `.doc` (HTML z przestrzeniami nazw Worda) zawierający CV,
    a po włączeniu listu motywacyjnego także list na następnej stronie;
  - **PDF** – otwiera się osobne okno druku z samym dokumentem (bez interfejsu
    aplikacji); w oknie wybierz „Zapisz jako PDF". Działa też w osadzeniu Google Sites.
  Jeśli nie zaznaczysz żadnego formatu, aplikacja pokaże ostrzeżenie i nic nie pobierze.

---

## Publikacja

### GitHub Pages (najprościej)

1. Utwórz repozytorium, np. `cvbuilder-web`.
2. Wgraj **całą zawartość katalogu `web\`** do gałęzi `main`
   (`index.html` musi być w katalogu głównym repozytorium).
3. W repozytorium: *Settings → Pages → Source: Deploy from a branch*,
   gałąź `main`, katalog `/ (root)`.
4. Po chwili program będzie pod adresem
   `https://twoja-nazwa.github.io/cvbuilder-web/`.

Repository `raminassar-arch/cvbuilder-web` jest już opublikowane – wystarczy
`git add . && git commit -m "..." && git push` z katalogu `web\`.

### Netlify Drop

1. Wejdź na `app.netlify.com/drop`.
2. Przeciągnij **katalog `web\`** (nie pojedyncze pliki).
3. Dostaniesz adres w rodzaju `https://cvbuilder.netlify.app/`.

### Własny serwer

Skopiuj zawartość `web\` do katalogu obsługiwanego przez serwer WWW.
Wymagania: poprawne typy MIME dla `.html`, `.js`, `.css` i `.svg`
(typowe hostingu statyczne ustawiają je domyślnie).

### Co wgrywać na hosting

Do działania aplikacji potrzebne są:

```
index.html
styles.css
i18n.js
app.js
favicon.svg
embed.html        (opcjonalnie – pomocnik osadzania)
.nojekyll         (wymagane przez GitHub Pages)
```

Plik `README.md` jest dokumentacją – nie jest potrzebny do działania aplikacji,
ale warto go zostawić w repozytorium.

---

## Osadzenie w Google Sites

W katalogu jest gotowy pomocnik: **`embed.html`**. Otwórz go z opublikowanego
adresu (np. `https://raminassar-arch.github.io/cvbuilder-web/embed.html`),
wklej adres aplikacji, skopiuj wygenerowany kod i w Google Sites użyj
**Wstaw → Osadź → Kod osadzania**.

Szkielet kodu:

```html
<iframe src="https://raminassar-arch.github.io/cvbuilder-web/"
        title="CVBuilder v2.5.0 – generator CV ATS (EN/PL/AR)"
        style="width:100%;height:1000px;border:0;display:block"
        allow="clipboard-write"></iframe>
```

Jeśli opcja „Kod osadzania” nie jest dostępna, użyj **Wstaw → Osadź → Adres URL**
i wklej tylko `https://raminassar-arch.github.io/cvbuilder-web/`.

Po wstawieniu rozciągnij blok na całą szerokość i ustaw wysokość ok. 900–1200 px
(zawartość nie zmienia rozmiaru bloku w Google Sites).

### Ograniczenia osadzenia

* **Pamięć przeglądarki.** Profil i ustawienia (język, tryb, styl dokumentu) są
  zapisywane w `localStorage`. W części przeglądarek (Safari, tryb prywatny)
  pamięć jest blokowana dla stron osadzonych w obcej domenie – aplikacja działa,
  ale dane nie zapisują się między odświeżeniami.
* **Zalecenie:** w Google Sites umieść przede wszystkim odnośnik „Otwórz CVBuilder”
  (samodzielna karta), a osadzenie traktuj jako podgląd. Gotowy kod przycisku
  generuje helper `embed.html` w sekcji 4.
* Pobrany plik `.doc` trafia do folderu pobranych przeglądarki – Google Sites
  nie pośredniczy w jego zapisie.
* PDF powstaje w osobnym oknie druku („Zapisz jako PDF"). Jeśli przeglądarka
  zablokuje otwarcie nowego okna z osadzonej ramki, aplikacja użyje awaryjnego
  druku na bieżącej stronie.

---

## Aktualizacja

Skopiuj zmienione pliki do katalogu `web\`, po czym z tego katalogu:

```bat
git add .
git commit -m "CVBuilder web update"
git push
```

Pages przebuduje stronę automatycznie. Jeśli zmieniłeś `app.js`, `styles.css`,
`i18n.js` lub `index.html`, pamiętaj o wymuszeniu odświeżenia pamięci podręcznej
(przez Ctrl+F5 u siebie; odwiedzający dostaną nowe pliki dzięki nagłówkom
`Cache-Control` GitHub Pages).

---

## Prywatność

Wszystkie dane wprowadzone do formularzy, import dokumentów `.docx`, analiza słów
kluczowych i tworzenie dokumentów odbywają się w przeglądarce przez JavaScript.
Plik DOCX jest rozpakowywany i czytany lokalnie — nie jest nigdzie wysyłany.
Nie ma żadnych żądań sieciowych, statystyk ani przesyłania danych; profil żyje
wyłącznie w `localStorage` przeglądarki, dopóki użytkownik sam go nie wyeksportuje.

---

## Autor

**Rami Nassar**, 2026 · **BIM Architects & Consultants**
Kontakt: **raminassar.arch@gmail.com**

# Konta, uprawnienia i wdrożenie pilotażowe

## Zweryfikowany zakres lokalny

Node.js 24+, SQLite w `data/blisko.sqlite`. `npm run dev` uruchamia API na 127.0.0.1:3001 i Vite na porcie 5173. Proxy `/api` pozwala używać jednej domeny. Jeśli używasz 127.0.0.1 zamiast localhost w przeglądarce, ustaw zgodny `APP_ORIGIN`. Przed uruchomieniem zatrzymaj własną poprzednią instancję.

Użytkownik zakłada konto z unikalnym loginem i hasłem min. 12 znaków. Hasła kont są haszowane scrypt z losową solą. Sesja: losowy token, w bazie tylko SHA-256 tokena, cookie HttpOnly/SameSite=Strict, 12 h. W produkcji cookie wymaga HTTPS. Operacje modyfikujące wymagają zgodnego Origin i JSON; logowanie/rejestracja są ograniczone do 30 prób na adres połączenia na 10 minut. Za reverse proxy jest to wspólny limit (nie ufamy dowolnemu X-Forwarded-For); przed większym ruchem potrzebny limit na proxy i przegląd konfiguracji.

Sprawa ma zaszyfrowany blob, neutralną nazwę, numer wersji oraz członkostwa. Metadane (nazwa sprawy, loginy, uprawnienia, daty) nie są szyfrowane. Treść jest szyfrowana AES-GCM w przeglądarce, hasło szyfrowania nie trafia do API. To hasło należy przekazać współpracownikom osobnym uzgodnionym kanałem.

- Właściciel: odczyt, zapis, nadawanie/odbieranie dostępu i usunięcie sprawy.
- Edytor: odczyt i zapis.
- Obserwator: odczyt; może modyfikować lokalną kopię, ale serwer odrzuca zapis do wspólnej sprawy.

Uprawnienia są sprawdzane na serwerze przy każdym żądaniu. Bez członkostwa serwer zwraca 404. Aktualizacja porównuje numer wersji w pojedynczym zapytaniu SQL; konflikt daje 409 i nie nadpisuje cudzej pracy. Synchronizacja jest ręczna. W razie konfliktu zachowaj własną pracę w lokalnej kopii, pobierz aktualną wersję i przenieś potrzebne zmiany. Nie ma automatycznego scalania.

Odebranie dostępu uniemożliwia kolejne odczyty, ale nie usuwa pobranych kopii ani znanego hasła. Nie jest to obietnica cofnięcia dostępu do danych już udostępnionych.

## Publikacja pod HTTPS — do wykonania na wybranym hostingu

Nie wykonano publicznego wdrożenia; brak wskazanego hostingu i domeny. Potrzebna jest domena oraz serwer z Node 24 i trwałym dyskiem. Wartości przykładowe są w `.env.example`; Node nie ładuje ich automatycznie. Ustaw zmienne przez menedżera procesu lub `node --env-file=/bezpieczna/sciezka/config.env server/index.js`.

1. Zainstaluj zależności `npm ci`, uruchom `npm test` oraz `npm run build`.
2. Ustaw `NODE_ENV=production`, `APP_ORIGIN=https://twoja-domena`, `DATABASE_PATH` na trwałym dysku. Serwer celowo odmawia produkcyjnego startu bez HTTPS w APP_ORIGIN.
3. Uruchom backend jako osobny użytkownik systemowy, dostępny tylko na loopback. Katalog danych powinien mieć 0700, baza 0600. Użyj menedżera procesu z restartem po awarii.
4. Serwuj `dist/` przez reverse proxy z TLS, a `/api/*` przekieruj do 127.0.0.1:3001. Dla SPA dodaj fallback do index.html. Nie udostępniaj katalogu repozytorium ani `data/` jako katalogu publicznego. Wstaw limity wielkości żądania i czasu.
5. Domyślnie rejestracja w produkcji jest wyłączona. Na kontrolowany pilotaż można czasowo ustawić `ALLOW_REGISTRATION=true`, założyć konta testowe i ponownie wyłączyć. To nie jest system zaproszeń ani weryfikacji tożsamości.
6. Ustaw CSP: domyślnie zasoby własne, `connect-src 'self' https://clinicaltrials.gov`, `frame-ancestors 'none'`, `base-uri 'self'`, `object-src 'none'`. Dodaj `X-Content-Type-Options: nosniff` i `Referrer-Policy: no-referrer`. Sprawdź działanie w przeglądarce po wdrożeniu, w tym CORS ClinicalTrials.gov.
7. Uruchom `BASE_URL=https://twoja-domena CHROMIUM_PATH=/sciezka/chromium npm run test:browser` wyłącznie na odizolowanej instancji testowej. Nowy test współpracy tworzy konta fikcyjne. Nie uruchamiaj automatycznych testów na bazie prawdziwych rodzin.

## Przed prawdziwymi danymi

Brakuje odzyskiwania hasła konta, usuwania konta, MFA, audytu administracyjnego, planu incydentów, automatycznych kopii bazy i przeglądu bezpieczeństwa niezależnego od implementacji. Przy SQLite w WAL nie kopiuj samego głównego pliku podczas pracy; wykonuj spójną kopię narzędziem backup SQLite lub zatrzymuj proces przed kopią wszystkich plików. Przetestuj odtworzenie. Szyfrowanie treści nie zastępuje bezpieczeństwa hostingu, przeglądarki i kontroli dostępu.

Obecne wdrożenie jest przygotowane do pilotażu na fikcyjnych danych, nie do przetwarzania dokumentacji medycznej.

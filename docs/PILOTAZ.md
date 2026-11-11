# Pilotaż Blisko — rekrutacja i pomiary

Status: przygotowany protokół. Nie zrekrutowano uczestników i nie wykonano sesji z opiekunami. Testy programistyczne nie są badaniem użyteczności.

## Rekrutacja

Zaproś 3–5 dorosłych opiekunów przez koordynatora zaprzyjaźnionej fundacji lub własną sieć kontaktów. Osoba udostępniająca zaproszenie nie powinna przekazywać danych pacjentów. Nie rekrutuj w sytuacji nagłego kryzysu i nie wiąż udziału z uzyskaniem pomocy. Zaproponuj sesję 20–30 minut, możliwość przerwania i wybór telefonu albo komputera. Uwzględnij różną sprawność cyfrową. Wynagrodzenie, jeśli przewidziane, powinno być niezależne od ukończenia zadań.

Tekst do samodzielnego przekazania przez organizatora (nie został wysłany):

> Szukamy dorosłych opiekunów do krótkiego testu narzędzia, które porządkuje poszukiwanie wsparcia, kontakty i zadania. Spotkanie potrwa około 25 minut. Testujemy narzędzie, nie umiejętności uczestnika. Pracujemy wyłącznie na fikcyjnych danych; nie pytamy o diagnozę ani sytuację finansową. Udział jest dobrowolny, można go przerwać bez podawania przyczyny. Prosimy o kontakt z organizatorem w sprawie dogodnego terminu i zasad pomiaru.

## Przed pierwszą sesją

1. Uruchom działającą instancję z HTTPS i ustal kontakt do organizatora; nie wysyłaj uczestnikom adresu localhost.
2. Użyj osobnych kont testowych, fikcyjnych nazw i danych. Nie proś o stosowanie prywatnych haseł. Udostępnianie ekranu ogranicz do panelu.
3. Poinformuj o celu, zbieranych danych (czas, ukończenie, trudność, pomoc prowadzącego, krótkie notatki), miejscu przechowywania i terminie usunięcia. Proponowany termin: 30 dni po podsumowaniu. Ustal go z organizatorem i przekaż uczestnikowi przed zgodą.
4. Nadaj kod P01–P05. Dane do organizacji spotkania przechowuj osobno od pomiarów. Nie nagrywaj audio/wideo w tym protokole. Na życzenie uczestnika usuń jego obserwacje; nie obiecuj pełnej anonimowości, jeśli organizator zna kod i osobę.
5. Zanotuj typ urządzenia i ewentualne potrzeby dostępności, bez diagnoz.

## Przebieg

Wyjaśnij: „Testujemy panel. Jeśli coś nie jest jasne, to informacja dla nas. Nie musisz kończyć zadania”. Zaznacz zgodę w zakładce Pilotaż dopiero po świadomym potwierdzeniu uczestnika.

Zadania w panelu:
- znajdź Fundację Dzieciom, zapisz trop i notatkę;
- przygotuj zapytanie i zmień podpis na „Osoba testowa”;
- dodaj zadanie i oznacz je jako wykonane;
- zapisz, wyeksportuj i odtwórz fikcyjną kopię.

W zakładce Pilotaż wybierz zadanie, uruchom pomiar i przejdź do odpowiedniego widoku. Zatrzymaj pomiar po osiągnięciu celu lub przerwaniu. Oznacz wynik jako ukończone, nieukończone albo przerwane; odnotuj pomoc. Zapytaj o trudność 1–5, gdzie 1 oznacza bardzo łatwe. Nie wprowadzaj sugestii w czasie samodzielnej próby. Po 3 minutach bez postępu zaproponuj zakończenie albo pomoc i odnotuj interwencję.

Dla 2 porównywalnych zadań (wyszukanie i uporządkowanie źródła, przygotowanie zapytania) przeprowadź także próbę dotychczasowym sposobem uczestnika. Zmień kolejność między uczestnikami, aby ograniczyć efekt nauki. Nie porównuj szyfrowanego backupu z brakiem takiej funkcji jako „zaoszczędzonego czasu”. Nie uśredniaj bezpośrednio prób ukończonych i nieukończonych.

## Analiza

Wyeksportuj JSON z sesji. Zestaw medianę czasu ukończonych zadań, odsetek ukończeń, pomoc prowadzącego i ocenę trudności osobno dla każdego zadania i metody. Oszczędność czasu licz tylko dla porównywalnych, ukończonych par tego samego uczestnika: czas dotychczasowy minus czas panelu. Przy 3–5 osobach wyniki są wskazówką jakościową, nie dowodem statystycznym.

Pytania na koniec: „Co było niejasne?”, „Który krok wymagał najwięcej wysiłku?”, „Co musiałoby się zmienić, żeby użyć tego ponownie?”. Nie sugeruj pozytywnej oceny.

Wstrzymaj szerszy pilotaż po wykryciu utraty danych, ujawnienia danych innej osoby, niejasnego statusu wyszukiwania lub niebezpiecznej interpretacji wyniku medycznego. Najpierw popraw błąd i ponów kontrolę techniczną.

## Brakujące działania organizatora

Pozyskać uczestników, ustalić terminy, uruchomić adres HTTPS i przeprowadzić sesje po uzyskaniu zgody. Obecnie nie istnieją obserwacje ani wnioski z prawdziwych opiekunów.

# Kostkowe Lochy

Przeglądarkowa gra akcji w klockowym 3D. Chodzisz bohaterem po wyspach połączonych mostami, rozbijasz fioletowe kryształy wroga i przejmujesz kapliczki, które potem budzą golemy walczące po twojej stronie. Cztery etapy: Mszysty Gaj, Piaskowe Ruiny, Żarzące Głębie i Upiorne Krypty. Dwa ostatnie kończą się walką ze strażnikiem.

**Zagraj:** https://babuuc.github.io/kostkowe-lochy/

## Rozwój postaci

- **Ulepszenia za odłamki:** Ostrze, Serce, Buty i Golemy, po 8 poziomów. Poziomy 4 i 8 dają dodatkowe premie, na przykład szansę na krytyk, regenerację albo wybuchające golemy.
- **Talenty za gwiazdki:** każda zdobyta gwiazdka to punkt. Trzy gałęzie (Miecz, Łuk, Dusza) po cztery stopnie; każdy stopień wymaga poprzedniego, a reset jest darmowy.

## Sterowanie

| | Komputer | Telefon |
|---|---|---|
| Ruch | WASD lub strzałki | lewy kciuk (drążek) |
| Miecz | lewy przycisk myszy lub J | czerwony przycisk albo dotyk prawej połowy ekranu |
| Łuk | prawy przycisk myszy lub K | przycisk z łukiem |
| Unik | Spacja | przycisk ze strzałkami |
| Wir ostrzy | Q | niebieska gwiazda |
| Mikstura | E | przycisk z flakonem |
| Pauza | Esc lub P | przycisk II |

## Uruchomienie u siebie

Wystarczy otworzyć `index.html` w przeglądarce. Gra pobiera z internetu tylko bibliotekę three.js i czcionkę, więc potrzebne jest połączenie z siecią.

## Budowa projektu

Nie ma kroku budowania ani zależności do instalowania. Pliki z folderu `js/` są zwykłymi skryptami ładowanymi po kolei w `index.html` i dzielą wspólne zmienne globalne, więc kolejność ma znaczenie.

```
index.html            układ ekranów: menu, HUD, pauza, wynik
css/style.css         wygląd interfejsu i przycisków dotykowych
js/01-narzedzia.js    funkcje pomocnicze i zapis postępu (localStorage)
js/02-dzwiek.js       dźwięki i muzyka syntezowane w Web Audio
js/03-grafika.js      renderer, światła, materiały, shader wody i lawy
js/04-dane.js         etapy, palety i statystyki przeciwników
js/05-swiat.js        budowa wysp, dekoracji i kapliczek, wyszukiwanie ścieżek
js/06-modele.js       modele postaci z klocków
js/07-efekty.js       cząsteczki, cięcia, pociski, łupy, liczby obrażeń
js/08-walka.js        walka, przejmowanie kapliczek, zachowanie wrogów
js/09-sterowanie.js   klawiatura, mysz i sterowanie dotykowe
js/10-bohater.js      ruch, ataki i animacja bohatera
js/11-symulacja.js    symulacja świata, światła dynamiczne, kamera
js/12-interfejs.js    HUD, minimapa, menu, ulepszenia, ekran wyniku
js/13-boss.js         Strażnik Otchłani: boss etapu 4 (model, fazy, ataki)
js/14-krypty.js       krypty: płyty z kolcami i urny dusz
js/15-start.js        pętla główna i uruchomienie gry
```

Nowy etap dodaje się w `js/04-dane.js` (tablica `LEVELS`): położenie i promień kapliczek, połączenia mostami oraz lista przeciwników każdej kapliczki.

# Integration Guide für dein Filament-Projekt

## Schritt 1: Lokales Package in deinem Laravel-Projekt einbinden

### Option A: Symlink (Empfohlen für Entwicklung)

1. In deiner Laravel-Projekt `composer.json`, füge ein Repository hinzu:

```json
{
    "repositories": [
        {
            "type": "path",
            "url": "../filament-fullcalendar",
            "options": {
                "symlink": true
            }
        }
    ],
    "require": {
        "saade/filament-fullcalendar": "@dev"
    }
}
```

2. Dann im Terminal deines Laravel-Projekts:
```bash
composer update saade/filament-fullcalendar
```

### Option B: Direkt die Dateien kopieren

Kopiere die geänderten Dateien in dein bestehendes Package:
- `vendor/saade/filament-fullcalendar/src/Widgets/Concerns/InteractsWithRawJS.php`
- `vendor/saade/filament-fullcalendar/resources/js/filament-fullcalendar.js`
- `vendor/saade/filament-fullcalendar/resources/views/fullcalendar.blade.php`
- `vendor/saade/filament-fullcalendar/dist/filament-fullcalendar.js`

## Schritt 2: Widget anpassen

Füge diese Methode zu deinem `StaffAssignmentCalendarWidget` hinzu:

```php
/**
 * Definiere welche Abteilungen standardmäßig ausgeklappt sein sollen
 */
public function getInitiallyExpandedResources(): array
{
    // Gib die Abteilungsnamen an, die ausgeklappt sein sollen
    return [
        'Produktion',    // Diese Abteilungen werden
        'Verwaltung',    // automatisch ausgeklappt
        'Lager',         // wenn der Kalender lädt
    ];
}
```

## Schritt 3: Cache leeren

Nach den Änderungen:

```bash
php artisan view:clear
php artisan cache:clear
php artisan filament:assets
```

## Fertig! 🎉

Jetzt werden die angegebenen Abteilungen automatisch ausgeklappt, wenn der Kalender geladen wird.

## Erweiterte Beispiele

### Dynamisch basierend auf Benutzer

```php
public function getInitiallyExpandedResources(): array
{
    $user = auth()->user();
    
    // Nur die eigene Abteilung ausgeklappt
    return [$user->abteilung];
}
```

### Basierend auf Schicht

```php
public function getInitiallyExpandedResources(): array
{
    $hour = now()->hour;
    
    if ($hour >= 6 && $hour < 14) {
        return ['Frühschicht', 'Produktion'];
    } elseif ($hour >= 14 && $hour < 22) {
        return ['Spätschicht', 'Verwaltung'];
    } else {
        return ['Nachtschicht'];
    }
}
```

### Mit Benutzerpräferenzen aus der Datenbank

```php
public function getInitiallyExpandedResources(): array
{
    $user = auth()->user();
    
    // Angenommen du hast eine user_preferences Tabelle
    $preferences = $user->preferences()
        ->where('key', 'expanded_departments')
        ->first();
    
    return $preferences ? json_decode($preferences->value, true) : ['Produktion'];
}
```

### Alle Abteilungen mit aktiven Aufträgen

```php
public function getInitiallyExpandedResources(): array
{
    // Zeige nur Abteilungen mit offenen Aufträgen
    return User::whereHas('productionLists', function ($query) {
            $query->where('status', '!=', 'Erledigt')
                  ->whereDate('created_at', today());
        })
        ->distinct()
        ->pluck('abteilung')
        ->filter()
        ->unique()
        ->values()
        ->toArray();
}
```

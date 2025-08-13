# Dynamic Resource Filtering Guide

Diese Lösung ermöglicht es, Resources im Calendar dynamisch basierend auf Filtern in einer Filament Table anzuzeigen/auszublenden.

## 🎯 Features

- **Dynamische Resource-Filterung** ohne Seiten-Reload
- **Bidirektionale Kommunikation** zwischen Table und Calendar
- **Performance-optimiert** durch Caching und gezieltes Updating
- **Flexible Filter-Optionen** (Abteilung, Skills, einzelne User, etc.)

## 📦 Implementation

### 1. Calendar Widget anpassen

Füge diese Properties und Methoden zu deinem `StaffAssignmentCalendarWidget` hinzu:

```php
// Properties für Filter-State
public array $filteredUserIds = [];
public bool $filterActive = false;
protected ?Collection $allResourcesCache = null;

// Livewire Listener für Table Events
#[On('table-filters-updated')]
public function handleTableFiltersUpdate(array $filterData): void
{
    $this->filteredUserIds = $filterData['userIds'] ?? [];
    $this->filterActive = !empty($this->filteredUserIds);
    $this->updateCalendarResources();
}

// Update Calendar Resources
protected function updateCalendarResources(): void
{
    $this->dispatch('update-calendar-resources', [
        'resources' => $this->getStaffResources()
    ]);
    $this->refreshRecords();
}

// Überschreibe getStaffResources() um Filter anzuwenden
public function getStaffResources(): array
{
    // Cache alle Resources für Performance
    if ($this->allResourcesCache === null) {
        $this->allResourcesCache = User::getUsersWithBusinessHoursAndStapelnummern();
    }

    $resources = $this->allResourcesCache;

    // Wende Filter an
    if ($this->filterActive && !empty($this->filteredUserIds)) {
        $resources = $resources->filter(function (User $user) {
            return in_array($user->id, $this->filteredUserIds);
        });
    }

    // Rest der Methode wie gehabt...
}
```

### 2. Table mit Events ausstatten

In deiner Filament Table Resource:

```php
SelectFilter::make('user')
    ->label('Mitarbeiter')
    ->relationship('user', 'name')
    ->multiple()
    ->afterStateUpdated(function ($state) {
        // Event an Calendar senden
        $this->dispatch('table-filters-updated', [
            'userIds' => $state ?? []
        ]);
    })
```

### 3. JavaScript erweitern (bereits erledigt)

Das JavaScript wurde bereits erweitert um Resource-Updates zu handhaben.

## 🚀 Verwendungsbeispiele

### Beispiel 1: Filter nach Abteilung

```php
// In der Table
SelectFilter::make('department')
    ->label('Abteilung')
    ->options(fn () => User::distinct()->pluck('abteilung', 'abteilung'))
    ->afterStateUpdated(function ($state) {
        $this->dispatch('filter-by-department', $state);
    })

// Im Calendar Widget
#[On('filter-by-department')]
public function filterByDepartment(string $department): void
{
    $this->filteredUserIds = User::where('abteilung', $department)
        ->pluck('id')
        ->toArray();
    
    $this->filterActive = true;
    $this->updateCalendarResources();
}
```

### Beispiel 2: Filter nach Skills

```php
// Im Calendar Widget
#[On('filter-by-skills')]
public function filterBySkills(array $skills): void
{
    $this->filteredUserIds = User::whereHas('skills', function ($query) use ($skills) {
        $query->whereIn('skill_id', $skills);
    })->pluck('id')->toArray();
    
    $this->filterActive = true;
    $this->updateCalendarResources();
}
```

### Beispiel 3: Bulk Action für ausgewählte Records

```php
Tables\Actions\BulkAction::make('show_in_calendar')
    ->label('Nur diese im Kalender anzeigen')
    ->action(function ($records) {
        $userIds = $records->pluck('user_id')->unique()->toArray();
        $this->dispatch('table-filters-updated', ['userIds' => $userIds]);
    })
```

## 🎨 Visuelles Feedback

Zeige dem User, dass Filter aktiv sind:

```php
public function resourceGroupLabelDidMount(): string
{
    return <<<JS
        function(info) {
            const isFiltered = {$this->filterActive} ? true : false;
            
            if (isFiltered) {
                // Markiere gefilterte Gruppen
                info.el.style.backgroundColor = '#fef3c7';
                info.el.style.borderLeft = '3px solid #f59e0b';
                
                // Filter-Icon hinzufügen
                const icon = document.createElement('span');
                icon.innerHTML = '🔍 ';
                icon.title = 'Gefilterte Ansicht';
                info.el.prepend(icon);
            }
        }
    JS;
}
```

## ⚡ Performance-Optimierungen

### 1. Resource Caching

```php
protected ?Collection $allResourcesCache = null;

public function mount(): void
{
    // Pre-load resources beim Mount
    $this->allResourcesCache = User::getUsersWithBusinessHoursAndStapelnummern();
}
```

### 2. Debouncing für Filter

```php
// In der Table - verhindere zu viele Updates
->debounce('500ms') // Warte 500ms nach letzter Eingabe
```

### 3. Lazy Loading

```php
// Lade Resources nur wenn Calendar sichtbar ist
public function loadResources(): void
{
    if ($this->isCalendarVisible()) {
        $this->allResourcesCache = User::getUsersWithBusinessHoursAndStapelnummern();
    }
}
```

## 🔄 Alternative: Resources via AJAX laden

Für sehr große Datenmengen kannst du Resources dynamisch nachladen:

```php
// Im Widget
public function fetchResources(array $info): array
{
    return $this->getStaffResources();
}

// Im JavaScript
resources: function(fetchInfo, successCallback, failureCallback) {
    this.$wire.fetchResources(fetchInfo)
        .then(successCallback)
        .catch(failureCallback)
}
```

## 📝 Zusammenfassung

Diese Lösung bietet:
- ✅ Nahtlose Integration zwischen Table und Calendar
- ✅ Performante dynamische Filterung
- ✅ Flexibel erweiterbar für verschiedene Filter-Typen
- ✅ Visuelles Feedback für aktive Filter
- ✅ Caching für optimale Performance

## Troubleshooting

**Problem:** Resources werden nicht aktualisiert
- Prüfe ob Livewire Events korrekt dispatched werden
- Check Browser Console für JavaScript Fehler
- Stelle sicher dass `npm run build` ausgeführt wurde

**Problem:** Performance-Probleme bei vielen Users
- Implementiere Resource Caching
- Nutze Pagination oder limitiere initial angezeigte Resources
- Verwende `fetchResources` für dynamisches Laden

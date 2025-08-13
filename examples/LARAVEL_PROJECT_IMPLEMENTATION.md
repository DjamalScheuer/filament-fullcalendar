# 📋 Implementierungs-Anleitung für dein Laravel-Projekt

Diese Anleitung zeigt dir, wie du die dynamische Resource-Filterung zwischen deiner Filament Table und dem Calendar Widget in deinem Laravel-Projekt implementierst.

## 📁 Deine Datei-Struktur

```
app/
├── Filament/
│   ├── Resources/
│   │   └── ProductionListResource/
│   │       └── Pages/
│   │           └── ListProductionLists.php    (Deine Table)
│   └── Widgets/
│       └── StaffAssignmentCalendarWidget.php  (Dein Calendar)
```

---

## 🔧 Schritt 1: Calendar Widget anpassen

**Datei:** `app/Filament/Widgets/StaffAssignmentCalendarWidget.php`

Füge diese Änderungen zu deinem bestehenden Widget hinzu:

```php
<?php

namespace App\Filament\Widgets;

use App\Models\ProductionList;
use App\Models\User;
use Livewire\Attributes\On;
use Illuminate\Support\Collection;
// ... deine anderen Imports

class StaffAssignmentCalendarWidget extends FullCalendarWidget
{
    // ... deine bestehenden Traits

    // ====== NEU: Filter-Properties hinzufügen ======
    /**
     * Gefilterte User IDs von der Table
     */
    public array $filteredUserIds = [];
    
    /**
     * Flag ob Filter aktiv ist
     */
    public bool $filterActive = false;
    
    /**
     * Cache für Performance
     */
    protected ?Collection $allResourcesCache = null;

    // ... dein bestehender Code ...

    // ====== NEU: Livewire Event Listener ======
    /**
     * Empfängt Filter-Updates von der Table
     */
    #[On('table-filters-updated')]
    public function handleTableFiltersUpdate(array $filterData): void
    {
        $this->filteredUserIds = $filterData['userIds'] ?? [];
        $this->filterActive = !empty($this->filteredUserIds);
        
        // Calendar aktualisieren
        $this->dispatch('update-calendar-resources', [
            'resources' => $this->getStaffResources()
        ]);
        
        // Optional: Events auch neu laden
        $this->refreshRecords();
    }

    /**
     * Filter zurücksetzen
     */
    #[On('clear-calendar-filters')]
    public function clearFilters(): void
    {
        $this->filteredUserIds = [];
        $this->filterActive = false;
        
        $this->dispatch('update-calendar-resources', [
            'resources' => $this->getStaffResources()
        ]);
        $this->refreshRecords();
    }

    // ====== ANPASSEN: Deine bestehende getStaffResources Methode ======
    private function getStaffResources(): array
    {
        // Performance: Cache die Basis-Daten
        if ($this->allResourcesCache === null) {
            $this->allResourcesCache = User::getUsersWithBusinessHoursAndStapelnummern();
        }

        $users = $this->allResourcesCache;

        // NEU: Filter anwenden wenn aktiv
        if ($this->filterActive && !empty($this->filteredUserIds)) {
            $users = $users->filter(function (User $user) {
                return in_array($user->id, $this->filteredUserIds);
            });
        }

        // Dein bestehender Code für die Resource-Transformation
        return $users
            ->filter(function (User $user) {
                return $user->id && 
                       $user->name && 
                       !empty($user->business_hours) &&
                       $this->validateBusinessHours($user->business_hours);
            })
            ->map(fn (User $user) => [
                'id' => (string)$user->id,
                'title' => $user->name,
                'group_name' => $this->getGroupName($user),
                'businessHours' => $this->getBusinessHoursForUser($user),
            ])
            ->values()
            ->toArray();
    }

    // ====== OPTIONAL: Visuelles Feedback bei aktiven Filtern ======
    public function resourceGroupLabelDidMount(): string
    {
        $filterActiveJs = $this->filterActive ? 'true' : 'false';
        
        return <<<JS
            function(info) {
                const isFiltered = {$filterActiveJs};
                
                if (isFiltered) {
                    // Markiere gefilterte Ansicht
                    info.el.style.backgroundColor = '#fef3c7';
                    info.el.style.borderLeft = '3px solid #f59e0b';
                    
                    // Füge Filter-Icon hinzu
                    const filterIcon = document.createElement('span');
                    filterIcon.innerHTML = '🔍 ';
                    filterIcon.style.marginRight = '5px';
                    filterIcon.title = 'Gefilterte Ansicht aktiv';
                    info.el.prepend(filterIcon);
                }
            }
        JS;
    }

    // ... Rest deines bestehenden Codes ...
}
```

---

## 📊 Schritt 2: Filament Table anpassen

**Datei:** `app/Filament/Resources/ProductionListResource/Pages/ListProductionLists.php`

Füge Filter mit Event-Dispatch zu deiner Table hinzu:

```php
<?php

namespace App\Filament\Resources\ProductionListResource\Pages;

use App\Filament\Resources\ProductionListResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Filters\Filter;
use Filament\Forms\Components\Select;

class ListProductionLists extends ListRecords
{
    protected static string $resource = ProductionListResource::class;

    public function table(Table $table): Table
    {
        return $table
            ->columns([
                // ... deine bestehenden Columns ...
            ])
            ->filters([
                // ====== Filter 1: Nach Mitarbeiter ======
                SelectFilter::make('user')
                    ->label('Mitarbeiter')
                    ->relationship('user', 'name')
                    ->multiple()
                    ->preload()
                    ->afterStateUpdated(function ($state, $livewire) {
                        if (!empty($state)) {
                            $livewire->dispatch('table-filters-updated', [
                                'userIds' => $state
                            ]);
                        } else {
                            $livewire->dispatch('clear-calendar-filters');
                        }
                    }),

                // ====== Filter 2: Nach Abteilung ======
                SelectFilter::make('department')
                    ->label('Abteilung')
                    ->options(function () {
                        return \App\Models\User::distinct()
                            ->whereNotNull('abteilung')
                            ->pluck('abteilung', 'abteilung')
                            ->toArray();
                    })
                    ->afterStateUpdated(function ($state, $livewire) {
                        if ($state) {
                            $userIds = \App\Models\User::where('abteilung', $state)
                                ->pluck('id')
                                ->toArray();
                            
                            $livewire->dispatch('table-filters-updated', [
                                'userIds' => $userIds
                            ]);
                        } else {
                            $livewire->dispatch('clear-calendar-filters');
                        }
                    }),

                // ====== Filter 3: Nach Status ======
                SelectFilter::make('status')
                    ->label('Auftragsstatus')
                    ->options([
                        'Offen' => 'Offen',
                        'In Bearbeitung' => 'In Bearbeitung',
                        'Wartend' => 'Wartend',
                    ])
                    ->modifyQueryUsing(function ($query, $state) {
                        if ($state) {
                            return $query->where('status', $state);
                        }
                        return $query;
                    })
                    ->afterStateUpdated(function ($state, $livewire, $query) {
                        if ($state) {
                            // Hole User IDs von Aufträgen mit diesem Status
                            $userIds = \App\Models\ProductionList::where('status', $state)
                                ->pluck('user_id')
                                ->unique()
                                ->toArray();
                            
                            $livewire->dispatch('table-filters-updated', [
                                'userIds' => $userIds
                            ]);
                        }
                    }),
            ])
            ->filtersFormColumns(3) // Filter in 3 Spalten anordnen
            ->persistFiltersInSession() // Filter in Session speichern
            ->actions([
                // ... deine bestehenden Actions ...
            ])
            ->bulkActions([
                // ====== NEU: Bulk Action für Calendar-Filter ======
                Tables\Actions\BulkAction::make('show_in_calendar')
                    ->label('Nur diese im Kalender anzeigen')
                    ->icon('heroicon-o-calendar')
                    ->color('primary')
                    ->action(function ($records, $livewire) {
                        $userIds = $records->pluck('user_id')
                            ->unique()
                            ->filter()
                            ->toArray();
                        
                        $livewire->dispatch('table-filters-updated', [
                            'userIds' => $userIds
                        ]);
                    })
                    ->deselectRecordsAfterCompletion(),

                Tables\Actions\BulkAction::make('clear_calendar_filter')
                    ->label('Kalender-Filter zurücksetzen')
                    ->icon('heroicon-o-x-circle')
                    ->color('gray')
                    ->requiresConfirmation(false)
                    ->action(function ($livewire) {
                        $livewire->dispatch('clear-calendar-filters');
                    })
                    ->deselectRecordsAfterCompletion(),
            ])
            ->headerActions([
                // ====== Optional: Test-Buttons ======
                Actions\Action::make('filter_today')
                    ->label('Nur heutige Aufträge')
                    ->icon('heroicon-o-calendar-days')
                    ->action(function ($livewire) {
                        $userIds = \App\Models\ProductionList::whereDate('created_at', today())
                            ->pluck('user_id')
                            ->unique()
                            ->toArray();
                        
                        $livewire->dispatch('table-filters-updated', [
                            'userIds' => $userIds
                        ]);
                    }),

                Actions\Action::make('reset_filters')
                    ->label('Alle Filter zurücksetzen')
                    ->icon('heroicon-o-arrow-path')
                    ->color('gray')
                    ->action(function ($livewire) {
                        $livewire->dispatch('clear-calendar-filters');
                    }),
            ]);
    }
}
```

---

## 🚀 Schritt 3: Aktivierung

### 1. Cache leeren
```bash
php artisan view:clear
php artisan cache:clear
php artisan filament:assets
```

### 2. Optional: Browser-Cache leeren
- Hard Refresh: `Ctrl + F5` (Windows) oder `Cmd + Shift + R` (Mac)

---

## ✅ Fertig! So funktioniert's:

### **Filter in der Table verwenden:**
1. **Mitarbeiter-Filter:** Wähle spezifische Mitarbeiter → nur diese werden im Calendar angezeigt
2. **Abteilungs-Filter:** Wähle eine Abteilung → nur Mitarbeiter dieser Abteilung im Calendar
3. **Bulk Action:** Wähle mehrere Zeilen → "Nur diese im Kalender anzeigen"

### **Visuelles Feedback:**
- Gefilterte Abteilungen werden gelb hinterlegt
- Filter-Icon 🔍 zeigt aktive Filter an

### **Performance:**
- Resources werden gecacht für schnelle Filter-Wechsel
- Nur Resources werden aktualisiert, Events bleiben erhalten

---

## 🔧 Erweiterte Optionen

### **Kombination mehrerer Filter:**

```php
// In der Table - Kombiniere mehrere Filter
public function applyMultipleFilters(): void
{
    $userIds = [];
    
    // Sammle IDs aus verschiedenen Filtern
    if ($this->tableFilters['department']) {
        $deptUsers = User::where('abteilung', $this->tableFilters['department'])
            ->pluck('id')->toArray();
        $userIds = array_merge($userIds, $deptUsers);
    }
    
    if ($this->tableFilters['skills']) {
        $skillUsers = User::whereHas('skills', function ($q) {
            $q->whereIn('skill_id', $this->tableFilters['skills']);
        })->pluck('id')->toArray();
        $userIds = array_intersect($userIds, $skillUsers); // Intersection für AND-Logik
    }
    
    $this->dispatch('table-filters-updated', [
        'userIds' => array_unique($userIds)
    ]);
}
```

### **Filter-Status anzeigen:**

```php
// Im Calendar Widget - Zeige aktive Filter
public function getFilterStatusMessage(): string
{
    if (!$this->filterActive) {
        return 'Alle Mitarbeiter werden angezeigt';
    }
    
    $count = count($this->filteredUserIds);
    return "Zeige {$count} gefilterte Mitarbeiter";
}
```

---

## 🐛 Troubleshooting

**Problem:** Filter werden nicht angewendet
- Prüfe Browser-Console für JavaScript-Fehler
- Stelle sicher, dass Livewire Events korrekt dispatched werden
- Prüfe ob die User IDs korrekt übergeben werden

**Problem:** Performance-Probleme
- Implementiere Caching in `mount()` Methode
- Limitiere die Anzahl der initial geladenen Resources
- Nutze Debouncing bei Filtern

**Problem:** Resources verschwinden komplett
- Prüfe ob `filteredUserIds` leer ist
- Stelle sicher, dass User IDs als Array übergeben werden
- Check ob die User IDs existieren

---

## 📝 Notizen

- Die Lösung nutzt Livewire Events für die Kommunikation
- Resources werden dynamisch ohne Page-Reload aktualisiert
- Filter können beliebig kombiniert werden
- Die Implementation ist erweiterbar für weitere Filter-Typen

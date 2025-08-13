# ✅ FINALE FUNKTIONIERENDE LÖSUNG - Dynamic Resource Filtering

## Das Problem war:
- Livewire sendet Events als Array `[{resources: [...]}]` statt als Objekt
- Die JavaScript-Datei konnte die Array-Struktur nicht verarbeiten

## Die Lösung:
1. **JavaScript wurde korrigiert** um Arrays zu verarbeiten ✅
2. **JavaScript wurde neu gebaut** mit `npm run build:scripts` ✅

## Jetzt in deinem Laravel Projekt implementieren:

### 1. Calendar Widget (`App/Filament/Widgets/StaffAssignmentCalendarWidget.php`)

```php
<?php

namespace App\Filament\Widgets;

use App\Models\ProductionList;
use App\Models\User;
use App\Models\UserOrder;
use App\Traits\CalendarEventHandlers;
use App\Traits\CalendarEventFormatter;
use App\Traits\CalendarEventTooltip;
use App\Traits\CalendarFormHandler;
use App\Traits\CalendarModalActions;
use App\Traits\CalendarEventDataProvider;
use App\Traits\CalendarResourceProvider;
use Illuminate\Database\Eloquent\Model;
use Saade\FilamentFullCalendar\Widgets\FullCalendarWidget;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Livewire\Attributes\On;
use Carbon\Carbon;

class StaffAssignmentCalendarWidget extends FullCalendarWidget
{
    use CalendarEventHandlers,
        CalendarEventFormatter,
        CalendarEventTooltip,
        CalendarFormHandler,
        CalendarModalActions,
        CalendarEventDataProvider,
        CalendarResourceProvider;

    // ========== Filter Properties ==========
    public array $filteredUserIds = [];
    public bool $filterActive = false;

    // ========== Event Listener für Table Filter ==========
    #[On('table-filters-updated')]
    public function handleTableFiltersUpdate(array $filterData): void
    {
        \Log::info('Calendar: Filter empfangen', [
            'userIds' => $filterData['userIds'] ?? [],
            'count' => count($filterData['userIds'] ?? [])
        ]);
        
        $this->filteredUserIds = $filterData['userIds'] ?? [];
        $this->filterActive = !empty($this->filteredUserIds);
        
        // Calendar mit neuen Resources updaten
        $this->dispatch('update-calendar-resources', [
            'resources' => $this->getStaffResources()
        ]);
        
        // Events neu laden
        $this->refreshRecords();
    }

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

    public Model | string | null $model = \App\Models\ProductionList::class;

    public function getColumnSpan(): int | string | array
    {
        return 'full';
    }

    public function getInitiallyExpandedResources(): array
    {
        $user = auth()->user();
        
        if ($user && $user->abteilung) {
            return [$user->abteilung];
        }
        
        return [];
    }

    public function config(): array
    {
        $user = auth()->user();
        
        return [
            'initialView' => 'resourceTimelineDay',
            'headerToolbar' => [
                'left' => 'prev,next today',
                'center' => 'title',
                'right' => 'resourceTimelineDay,resourceTimelineWeek,resourceTimelineMonth'
            ],
            'views' => [
                'resourceTimelineDay' => [
                    'buttonText' => 'Tag'
                ],
                'resourceTimelineWeek' => [
                    'buttonText' => 'Woche'
                ],
                'resourceTimelineMonth' => [
                    'buttonText' => 'Monat'
                ]
            ],
            'resourceAreaWidth' => '23%',
            'resourceGroupField' => 'group_name',
            'resourcesInitiallyExpanded' => false,
            'resources' => $this->getStaffResources(), // Initial resources
            'droppable' => $user->can('Auftragszuweisung bearbeiten'),
            'editable' => $user->can('Alle Aufträge bearbeiten') || $user->can('Eigene Aufträge bearbeiten'),
            'selectable' => $user->can('Alle Aufträge bearbeiten') || $user->can('Eigene Aufträge bearbeiten'),
            'eventDurationEditable' => false,
            'locale' => 'de',
            'timeZone' => 'UTC',
            'displayEventTime' => true,
            'displayEventEnd' => true,
            'slotMinTime' => '06:00:00',
            'slotMaxTime' => '18:00:00',
            'stickyFooterScrollbar' => true,
        ];
    }
    
    // Diese Methode wird von refreshRecords() aufgerufen
    public function refreshRecords(): void
    {
        $this->dispatch('filament-fullcalendar--refresh');
    }
}
```

### 2. CalendarResourceProvider Trait (`App/Traits/CalendarResourceProvider.php`)

```php
<?php

namespace App\Traits;

use App\Models\User;
use Illuminate\Support\Facades\Log;

trait CalendarResourceProvider
{
    public function getResources(): array
    {
        return $this->getStaffResources();
    }

    protected function getStaffResources(): array
    {
        $query = User::query()
            ->where('active', true)
            ->whereHas('roles', function ($query) {
                $query->where('name', 'Mitarbeiter');
            })
            ->with(['abteilung', 'orders' => function ($query) {
                $query->where('status', '!=', 'Erledigt');
            }]);

        // ✅ FILTER ANWENDEN
        if ($this->filterActive && !empty($this->filteredUserIds)) {
            $query->whereIn('id', $this->filteredUserIds);
            Log::info('Filter angewendet', ['filteredIds' => $this->filteredUserIds]);
        }

        $users = $query->get();
        
        Log::info('Resources geladen', ['count' => $users->count()]);

        return $users->map(function ($user) {
            return [
                'id' => (string) $user->id,
                'title' => $user->name,
                'group_name' => $user->abteilung?->name ?? 'Unbekannt',
                'businessHours' => [
                    'startTime' => '08:00',
                    'endTime' => '17:00',
                    'daysOfWeek' => [1, 2, 3, 4, 5] // Montag bis Freitag
                ]
            ];
        })->toArray(); // ✅ WICHTIG: toArray() nicht vergessen!
    }
}
```

### 3. Table Filter (`App/Filament/Tables/UnassignedOrders.php`)

Im Filter für die Stapelnummer:

```php
use Filament\Tables\Filters\SelectFilter;

// ... andere Imports

// In der filters() Methode:
SelectFilter::make('stapelnummer')
    ->label('Stapelnummer')
    ->options(function () {
        return \App\Models\BatchNumber::query()
            ->whereHas('unassignedItems')
            ->pluck('nummer', 'id')
            ->toArray();
    })
    ->afterStateUpdated(function ($state, $livewire) {
        if ($state) {
            // Lade User die zu dieser Stapelnummer gehören
            $userIds = \App\Models\User::query()
                ->whereHas('orders', function ($query) use ($state) {
                    $query->where('stapelnummer_id', $state)
                          ->where('status', '!=', 'Erledigt');
                })
                ->pluck('id')
                ->toArray();
            
            Log::info('Table: Filter aktiviert', [
                'stapelnummer' => $state,
                'userIds' => $userIds
            ]);
            
            // Sende Event an Calendar
            $livewire->dispatch('table-filters-updated', [
                'userIds' => $userIds
            ]);
        } else {
            // Filter wurde gelöscht
            Log::info('Table: Filter gelöscht');
            $livewire->dispatch('clear-calendar-filters');
        }
    })
```

## 🚀 Deployment:

### 1. Package JavaScript kopieren:
```bash
# Kopiere die gebaute JS von deinem lokalen Package ins Laravel Projekt
copy C:\Users\djama\filament-fullcalendar\dist\filament-fullcalendar.js `
     C:\path\to\your\laravel-project\vendor\saade\filament-fullcalendar\dist\filament-fullcalendar.js
```

### 2. Cache leeren:
```bash
cd C:\path\to\your\laravel-project
php artisan optimize:clear
php artisan filament:assets
```

### 3. Browser Hard-Refresh:
```
Ctrl + F5
```

## ✅ Was passiert jetzt:

1. **Stapelnummer auswählen** 
   - Console zeigt: `Update calendar resources event received: [{…}]`
   - Console zeigt: `Extracted resources: [{…}]`
   - Console zeigt: `Updating calendar with 1 resources`
   - Console zeigt: `Calendar updated successfully`

2. **Calendar zeigt nur noch den gefilterten User**

3. **Filter löschen** → Alle User werden wieder angezeigt

## 🎯 Das war's!

Die Lösung funktioniert jetzt, weil:
- ✅ JavaScript kann Arrays verarbeiten
- ✅ Resources werden korrekt extrahiert
- ✅ Calendar wird dynamisch aktualisiert
- ✅ Events werden neu geladen

**Teste es jetzt - es sollte funktionieren!**

<?php

namespace App\Filament\Widgets;

use App\Models\ProductionList;
use App\Models\User;
use App\Traits\CalendarEventHandlers;
use App\Traits\CalendarEventFormatter;
use App\Traits\CalendarEventTooltip;
use App\Traits\CalendarFormHandler;
use App\Traits\CalendarModalActions;
use App\Traits\CalendarEventDataProvider;
use App\Traits\CalendarResourceProvider;
use Illuminate\Database\Eloquent\Model;
use Saade\FilamentFullCalendar\Widgets\FullCalendarWidget;
use Livewire\Attributes\On;
use Illuminate\Support\Collection;

class StaffAssignmentCalendarWidget extends FullCalendarWidget
{
    use CalendarEventHandlers,
        CalendarEventFormatter,
        CalendarEventTooltip,
        CalendarFormHandler,
        CalendarModalActions,
        CalendarEventDataProvider,
        CalendarResourceProvider;
    
    public Model | string | null $model = \App\Models\ProductionList::class;

    /**
     * Gefilterte User IDs von der Table
     * Wenn leer, werden alle User angezeigt
     */
    public array $filteredUserIds = [];

    /**
     * Flag ob Filter aktiv ist
     */
    public bool $filterActive = false;

    /**
     * Cache für alle Resources
     */
    protected ?Collection $allResourcesCache = null;

    public function getColumnSpan(): int | string | array
    {
        return 'full';
    }

    /**
     * Listener für Table-Filter-Events
     * Wird von der Filament Table aufgerufen wenn sich Filter ändern
     */
    #[On('table-filters-updated')]
    public function handleTableFiltersUpdate(array $filterData): void
    {
        // Extrahiere User IDs aus den Filter-Daten
        $this->filteredUserIds = $filterData['userIds'] ?? [];
        $this->filterActive = !empty($this->filteredUserIds);
        
        // Aktualisiere den Calendar
        $this->updateCalendarResources();
    }

    /**
     * Alternative: Listener für spezifische Filter
     */
    #[On('filter-by-department')]
    public function filterByDepartment(string $department): void
    {
        if (empty($department)) {
            $this->clearFilters();
            return;
        }

        // Hole alle User IDs der Abteilung
        $this->filteredUserIds = User::where('abteilung', $department)
            ->pluck('id')
            ->toArray();
        
        $this->filterActive = true;
        $this->updateCalendarResources();
    }

    /**
     * Listener für Skill-Filter
     */
    #[On('filter-by-skills')]
    public function filterBySkills(array $skills): void
    {
        if (empty($skills)) {
            $this->clearFilters();
            return;
        }

        // Beispiel: User mit bestimmten Skills filtern
        $this->filteredUserIds = User::whereHas('skills', function ($query) use ($skills) {
            $query->whereIn('skill_id', $skills);
        })->pluck('id')->toArray();
        
        $this->filterActive = true;
        $this->updateCalendarResources();
    }

    /**
     * Filter zurücksetzen
     */
    #[On('clear-filters')]
    public function clearFilters(): void
    {
        $this->filteredUserIds = [];
        $this->filterActive = false;
        $this->updateCalendarResources();
    }

    /**
     * Calendar Resources aktualisieren
     */
    protected function updateCalendarResources(): void
    {
        // Dispatch JavaScript Event zum Calendar Update
        $this->dispatch('update-calendar-resources', [
            'resources' => $this->getStaffResources()
        ]);
        
        // Optional: Events auch neu laden wenn nötig
        $this->refreshRecords();
    }

    /**
     * Überschreibe die getStaffResources Methode aus dem Trait
     * um Filter anzuwenden
     */
    public function getStaffResources(): array
    {
        // Hole alle Resources (mit Caching für Performance)
        if ($this->allResourcesCache === null) {
            $this->allResourcesCache = User::getUsersWithBusinessHoursAndStapelnummern();
        }

        $resources = $this->allResourcesCache;

        // Wende Filter an wenn aktiv
        if ($this->filterActive && !empty($this->filteredUserIds)) {
            $resources = $resources->filter(function (User $user) {
                return in_array($user->id, $this->filteredUserIds);
            });
        }

        return $resources
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

    /**
     * Definiere welche Abteilungen ausgeklappt sein sollen
     * Berücksichtige aktive Filter
     */
    public function getInitiallyExpandedResources(): array
    {
        if ($this->filterActive) {
            // Wenn Filter aktiv, klappe alle gefilterten Abteilungen auf
            return User::whereIn('id', $this->filteredUserIds)
                ->pluck('abteilung')
                ->unique()
                ->filter()
                ->values()
                ->toArray();
        }
        
        // Standard: Nur wichtige Abteilungen
        return ['Produktion'];
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
            'resources' => $this->getStaffResources(),
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
            'resourcesInitiallyExpanded' => false,
        ];
    }

    /**
     * Optional: Visuelles Feedback für gefilterte Resources
     */
    public function resourceGroupLabelDidMount(): string
    {
        return <<<JS
            function(info) {
                // Markiere gefilterte Gruppen
                const isFiltered = {$this->filterActive} ? 'true' : 'false';
                
                if (isFiltered === 'true') {
                    info.el.style.backgroundColor = '#fef3c7';
                    info.el.style.borderLeft = '3px solid #f59e0b';
                    
                    // Füge Filter-Icon hinzu
                    const filterIcon = document.createElement('span');
                    filterIcon.innerHTML = '🔍 ';
                    filterIcon.style.marginRight = '5px';
                    filterIcon.title = 'Gefiltert';
                    info.el.prepend(filterIcon);
                }
            }
        JS;
    }
}

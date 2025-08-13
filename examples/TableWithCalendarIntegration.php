<?php

namespace App\Filament\Resources\ProductionListResource\Pages;

use App\Filament\Resources\ProductionListResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;
use Filament\Tables\Filters\Filter;
use Filament\Tables\Filters\SelectFilter;
use Illuminate\Database\Eloquent\Builder;

class ListProductionLists extends ListRecords
{
    protected static string $resource = ProductionListResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }

    /**
     * Überschreibe die table() Methode um Filter-Events zu dispatchen
     */
    public function table(Table $table): Table
    {
        return $table
            ->columns([
                // Deine bestehenden Columns...
            ])
            ->filters([
                SelectFilter::make('user')
                    ->label('Mitarbeiter')
                    ->relationship('user', 'name')
                    ->multiple()
                    ->preload()
                    ->afterStateUpdated(function ($state) {
                        // Sende Event an Calendar Widget
                        $this->dispatch('table-filters-updated', [
                            'userIds' => $state ?? []
                        ]);
                    }),
                    
                SelectFilter::make('department')
                    ->label('Abteilung')
                    ->options(fn () => \App\Models\User::distinct()
                        ->whereNotNull('abteilung')
                        ->pluck('abteilung', 'abteilung'))
                    ->afterStateUpdated(function ($state) {
                        // Sende spezifisches Department Event
                        $this->dispatch('filter-by-department', $state);
                    }),
                    
                Filter::make('has_skills')
                    ->form([
                        Select::make('skills')
                            ->label('Erforderliche Skills')
                            ->multiple()
                            ->options(fn () => \App\Models\Skill::pluck('name', 'id'))
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        if (!empty($data['skills'])) {
                            // Sende Skills Event an Calendar
                            $this->dispatch('filter-by-skills', $data['skills']);
                            
                            return $query->whereHas('requiredSkills', function ($q) use ($data) {
                                $q->whereIn('skill_id', $data['skills']);
                            });
                        }
                        return $query;
                    }),
                    
                // Clear All Filters Action
                Filter::make('clear')
                    ->form([])
                    ->indicateUsing(function (array $data): ?string {
                        return 'Filter aktiv';
                    })
            ])
            ->filtersFormColumns(3)
            ->persistFiltersInSession()
            // Wichtig: Hook für Filter-Änderungen
            ->afterStateUpdated(function () {
                $this->updateCalendarBasedOnFilters();
            });
    }

    /**
     * Zentrale Methode um Calendar zu aktualisieren basierend auf allen aktiven Filtern
     */
    protected function updateCalendarBasedOnFilters(): void
    {
        $activeFilters = $this->getTableFilters();
        $userIds = [];
        
        // Sammle alle User IDs basierend auf aktiven Filtern
        foreach ($activeFilters as $filter => $value) {
            if ($value === null) continue;
            
            switch ($filter) {
                case 'user':
                    $userIds = array_merge($userIds, (array) $value);
                    break;
                    
                case 'department':
                    $departmentUsers = \App\Models\User::where('abteilung', $value)
                        ->pluck('id')
                        ->toArray();
                    $userIds = array_merge($userIds, $departmentUsers);
                    break;
                    
                // Weitere Filter...
            }
        }
        
        // Entferne Duplikate
        $userIds = array_unique($userIds);
        
        // Sende Update an Calendar
        if (!empty($userIds)) {
            $this->dispatch('table-filters-updated', [
                'userIds' => $userIds
            ]);
        } else {
            // Keine Filter aktiv - zeige alle
            $this->dispatch('clear-filters');
        }
    }

    /**
     * Alternative: Nutze Livewire's updated Hook
     */
    public function updatedTableFilters(): void
    {
        $this->updateCalendarBasedOnFilters();
    }
}


/**
 * Alternative Implementation als Table Action
 */
class ProductionListTableWithCalendarSync extends ListRecords
{
    // ... andere Code ...
    
    protected function getTableBulkActions(): array
    {
        return [
            Tables\Actions\BulkAction::make('show_in_calendar')
                ->label('Im Kalender anzeigen')
                ->icon('heroicon-o-calendar')
                ->action(function ($records) {
                    // Hole User IDs von ausgewählten Records
                    $userIds = $records->pluck('user_id')->unique()->toArray();
                    
                    // Sende an Calendar
                    $this->dispatch('table-filters-updated', [
                        'userIds' => $userIds
                    ]);
                }),
                
            Tables\Actions\BulkAction::make('clear_calendar_filter')
                ->label('Kalender-Filter zurücksetzen')
                ->icon('heroicon-o-x-circle')
                ->action(function () {
                    $this->dispatch('clear-filters');
                })
        ];
    }
}

<?php

namespace Saade\FilamentFullCalendar\Widgets;

use Filament\Actions\Action;
use Filament\Actions\Concerns\InteractsWithActions;
use Filament\Actions\Contracts\HasActions;
use Filament\Forms\Concerns\InteractsWithForms;
use Filament\Forms\Contracts\HasForms;
use Filament\Widgets\Widget;
use Saade\FilamentFullCalendar\Actions;

class FullCalendarWidget extends Widget implements HasForms, HasActions
{
    use InteractsWithForms;
    use InteractsWithActions;
    use Concerns\InteractsWithEvents;
    use Concerns\InteractsWithRecords;
    use Concerns\InteractsWithHeaderActions;
    use Concerns\InteractsWithModalActions;
    use Concerns\InteractsWithRawJS;
    use Concerns\CanBeConfigured;
    use Concerns\CanSearch;

    protected static string $view = 'filament-fullcalendar::fullcalendar';

    protected int | string | array $columnSpan = 'full';

    protected function headerActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }

    protected function modalActions(): array
    {
        return [
            Actions\EditAction::make(),
            Actions\DeleteAction::make(),
        ];
    }

    protected function viewAction(): Action
    {
        return Actions\ViewAction::make();
    }

    /**
     * FullCalendar will call this function whenever it needs new event data.
     * This is triggered when the user clicks prev/next or switches views.
     * @param array{start: string, end: string, timezone: string} $info
     */
    public function fetchEvents(array $info): array
    {
        return [];
    }

    public function getFormSchema(): array
    {
        return [];
    }

    /**
     * Return a list of resource group values (e.g. department names) that should
     * be expanded when a searched event is selected.
     *
     * Override this in your widget to map an $eventId to its resource group(s).
     * By default, nothing is expanded.
     */
    public function getResourceGroupsForEvent(string $eventId): array
    {
        return [];
    }

    /**
     * Generate a unique session storage key for expanded resource groups
     * scoped to this widget instance.
     */
    public function getExpandedGroupsSessionKey(): string
    {
        return 'filament_fullcalendar.expanded_groups.' . static::class . '.' . $this->getId();
    }

    /**
     * Return persisted expanded resource groups from the session.
     *
     * @return array<int, string>
     */
    public function getPersistedExpandedResources(): array
    {
        $groups = session($this->getExpandedGroupsSessionKey(), []);

        if (! is_array($groups)) {
            return [];
        }

        // Normalize as array of strings without duplicates
        $normalized = array_map('strval', $groups);

        return array_values(array_unique($normalized));
    }

    /**
     * Persist the expanded resource groups in the session.
     *
     * Invoked from the frontend via $wire.saveExpandedGroups([...]).
     *
     * @param array<int, string|int> $groups
     */
    public function saveExpandedGroups(array $groups): void
    {
        // Normalize as array of unique strings
        $normalized = array_values(array_unique(array_map('strval', $groups)));

        session([$this->getExpandedGroupsSessionKey() => $normalized]);
    }
}

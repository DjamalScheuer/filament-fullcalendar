# Resource Timeline Selective Expansion Feature

This example demonstrates how to control which resource groups are expanded or collapsed by default in the `resourceTimeline` view.

## New Features Added

### 1. `getInitiallyExpandedResources()` Method
Override this method in your widget to specify which resource groups should be initially expanded:

```php
public function getInitiallyExpandedResources(): array
{
    return [
        'building-a',  // These group IDs will be expanded
        'building-c',  // automatically when the calendar loads
    ];
}
```

### 2. `resourceGroupLabelDidMount()` Callback
Use this callback for advanced customization of resource group labels:

```php
public function resourceGroupLabelDidMount(): string
{
    return <<<JS
        function(info) {
            // Custom styling based on group value
            if (info.groupValue === 'vip-section') {
                info.el.style.backgroundColor = '#fef3c7';
            }
        }
    JS;
}
```

## How It Works

1. When the calendar renders in `resourceTimeline` view with grouped resources
2. The `resourceGroupLabelDidMount` callback is triggered for each resource group
3. The callback checks if the group's ID is in the `initiallyExpandedResources` array
4. If matched, it programmatically clicks the expander element to expand that group
5. All other groups remain collapsed (unless `resourcesInitiallyExpanded: true` is set in config)

## Usage Example

```php
class RoomBookingWidget extends FullCalendarWidget
{
    public function config(): array
    {
        return [
            'initialView' => 'resourceTimelineMonth',
            'resources' => [
                ['id' => 'room-1', 'building' => 'main', 'title' => 'Conference Room 1'],
                ['id' => 'room-2', 'building' => 'main', 'title' => 'Conference Room 2'],
                ['id' => 'room-3', 'building' => 'annex', 'title' => 'Meeting Room 1'],
            ],
            'resourceGroupField' => 'building',
            'resourcesInitiallyExpanded' => false, // Start with all collapsed
        ];
    }
    
    public function getInitiallyExpandedResources(): array
    {
        // Only expand the 'main' building by default
        return ['main'];
    }
}
```

## Benefits

- **Better UX**: Users see relevant resource groups expanded automatically
- **Performance**: Large resource lists load faster with most groups collapsed
- **Flexibility**: Different views can have different expansion states
- **Customization**: Combine with styling and tooltips for enhanced interaction

## Requirements

- FullCalendar Scheduler license (for resourceTimeline view)
- Include required plugins: `timeline`, `resource`, `resourceTimeline`

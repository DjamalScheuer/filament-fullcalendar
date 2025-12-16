<?php

namespace Saade\FilamentFullCalendar\Widgets\Concerns;

trait InteractsWithRawJS
{
    /**
     * A ClassName Input for adding classNames to the outermost event element.
     * If supplied as a callback function, it is called every time the associated event data changes.
     *
     * @see https://fullcalendar.io/docs/event-render-hooks
     *
     * @return string
     */
    public function eventClassNames(): string
    {
        return <<<JS
            null
        JS;
    }

    /**
     * A Content Injection Input. Generated content is inserted inside the inner-most wrapper of the event element.
     * If supplied as a callback function, it is called every time the associated event data changes.
     *
     * @see https://fullcalendar.io/docs/event-render-hooks
     *
     * @return string
     */
    public function eventContent(): string
    {
        return <<<JS
            null
        JS;
    }

    /**
     * Called right after the element has been added to the DOM. If the event data changes, this is NOT called again.
     *
     * @see https://fullcalendar.io/docs/event-render-hooks
     *
     * @return string
     */
    public function eventDidMount(): string
    {
        return <<<JS
            null
        JS;
    }

    /**
     * Called right before the element will be removed from the DOM.
     *
     * @see https://fullcalendar.io/docs/event-render-hooks
     *
     * @return string
     */
    public function eventWillUnmount(): string
    {
        return <<<JS
            null
        JS;
    }

    /**
     * Called when a resource group label is mounted in the resourceTimeline view.
     * Useful for controlling which resources are initially expanded/collapsed.
     *
     * @see https://fullcalendar.io/docs/resource-group-label-render-hooks
     *
     * @return string
     */
    public function resourceGroupLabelDidMount(): string
    {
        return <<<JS
            null
        JS;
    }

    /**
     * A Content Injection Input for customizing the content of a resource's label.
     * Generated content is inserted inside the resource label element.
     * If supplied as a callback function, it is called every time the resource data is rendered.
     *
     * NOTE: This hook only works when resourceAreaColumns is NOT used.
     * For resourceAreaColumns, use resourceAreaColumnCellContent() instead.
     *
     * @see https://fullcalendar.io/docs/resource-render-hooks
     *
     * @return string
     */
    public function resourceLabelContent(): string
    {
        return <<<JS
            null
        JS;
    }

    /**
     * Called right after the resource label element has been added to the DOM.
     * If the resource data changes, this is NOT called again.
     *
     * @see https://fullcalendar.io/docs/resource-render-hooks
     *
     * @return string
     */
    public function resourceLabelDidMount(): string
    {
        return <<<JS
            null
        JS;
    }

    /**
     * A Content Injection Input for customizing the content of resourceAreaColumns cells.
     * This callback is applied to ALL columns defined in resourceAreaColumns.
     *
     * The callback receives an object with:
     * - resource: The Resource object
     * - fieldValue: The value of the field for this column
     * - view: The current View object
     *
     * You can check which column is being rendered via the fieldValue or resource properties.
     *
     * Example:
     * ```php
     * public function resourceAreaColumnCellContent(): string
     * {
     *     return <<<'JS'
     *         function(arg) {
     *             const resource = arg.resource;
     *             const fieldValue = arg.fieldValue;
     *
     *             // Check which column based on fieldValue or use resource.extendedProps
     *             if (fieldValue && fieldValue.includes && fieldValue.includes('\n')) {
     *                 // Multi-line content - format with HTML
     *                 const lines = fieldValue.split('\n');
     *                 return {
     *                     html: '<div style="line-height:1.4">' +
     *                           lines.map(l => '<div>' + l + '</div>').join('') +
     *                           '</div>'
     *                 };
     *             }
     *             return null; // Use default rendering
     *         }
     *     JS;
     * }
     * ```
     *
     * @see https://fullcalendar.io/docs/resource-area-columns
     *
     * @return string
     */
    public function resourceAreaColumnCellContent(): string
    {
        return <<<JS
            null
        JS;
    }

    /**
     * A Content Injection Input for customizing the content of a resource's lane (the horizontal area for events).
     * Only available in timeline views.
     *
     * @see https://fullcalendar.io/docs/resource-render-hooks
     *
     * @return string
     */
    public function resourceLaneContent(): string
    {
        return <<<JS
            null
        JS;
    }

    /**
     * Called right after a resource's lane has been added to the DOM.
     * Only available in timeline views.
     *
     * @see https://fullcalendar.io/docs/resource-render-hooks
     *
     * @return string
     */
    public function resourceLaneDidMount(): string
    {
        return <<<JS
            null
        JS;
    }

    /**
     * Provide an array of resource IDs that should be initially expanded.
     * Only works with resourceTimeline view when resources have grouping.
     *
     * @return array
     */
    public function getInitiallyExpandedResources(): array
    {
        return [];
    }
}

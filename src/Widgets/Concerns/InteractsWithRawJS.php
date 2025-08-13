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

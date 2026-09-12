# Accommodations

Link an accommodation to specific check-in and check-out days so it appears for every day you are staying there. Accommodations are a distinct record type backed by the `day_accommodations` table and are separate from regular reservations, though each accommodation automatically creates a linked **Hotel** reservation.

## Creating an accommodation

There are two ways to create an accommodation:

**From the Reservations panel:** Click **Manual Booking** and select **Hotel** as the booking type. When the type is set to Hotel, the date/time and location fields are replaced by accommodation-specific inputs (see below). Saving the form creates both the hotel reservation and the underlying accommodation record at the same time.

**From the Day Detail panel:** Click the hotel icon or the **Add accommodation** button in the Day Detail overlay. A picker appears that lets you select a place from the trip, choose the day range, and optionally fill in check-in/check-out times and a confirmation code. This creates the accommodation record and its linked Hotel reservation together.

![Accommodation reservation card showing check-in details](assets/Hotel-ReservationCard.png)

## Accommodation-specific fields

When creating or editing via the Reservations panel with type set to **Hotel**, the date/time and location fields are replaced by accommodation-specific inputs:

| Field | Description |
|-------|-------------|
| **Accommodation** | Search for or select an existing trip place to link as the property. Selecting a place pre-fills the title if it is empty and pre-fills the location field if the place has an address |
| **From** | The check-in day |
| **To** | The check-out day |
| **Check-in** | The earliest time you can check in |
| **Check-in until** | The latest time the front desk accepts check-in |
| **Check-out** | The latest time you must check out |

The **Confirmation code**, **Status** (Pending / Confirmed), and **Notes** fields are also available, as they are for all reservation types.

## In the Day Detail panel

For each day between the **From** day and **To** day (inclusive), the accommodation appears in the Day Detail panel overlay. It shows the linked place name and address, a check-in or check-out label for the relevant boundary days, and the check-in window, check-out time, and confirmation code if set. Middle nights show the place name without a check-in/check-out label. The linked Hotel reservation's status and confirmation number are also shown inline.

![Day planner side bar with accomodation](assets/Hotel-ReservationDaySidebar.png)

## On the route

Booking a night from the Day Detail panel also puts its place on the check-in day, as a
stop of its own. That stop is what the map draws a line to and what the Road Trip view
builds its route from, so the hotel now shows up there without having to be entered a
second time as an ordinary place. A night booked in the Road Trip view has always worked
this way; this makes the two directions match.

A few details worth knowing:

- Only the check-in day gets a stop, however many nights the stay runs. That is the day
  you travel there; the later nights keep showing as badges in the day header.
- The place is marked as a **hotel** stop, which is why it carries no number in the Road
  Trip rail and does not count towards the day's stop total. If you had already given the
  place a stop type of your own, that one is kept.
- If the place was already planned for that day, nothing is added. You keep the stop you
  placed, and the booking simply rides along with it.
- Moving the booking to a different check-in day moves its stop with it. Deleting the
  booking removes the stop it created, and leaves a stop you placed yourself standing.
- Service stops, hotels among them, can be hidden from the day lists with **Show in Days
  too** under **Service stops** in the Road Trip settings.

Stays booked before this existed keep their day plans untouched. Open such a booking and
save it once and it picks up its stop.

## In the day plan sidebar

Accommodations appear as small colour-coded badges in the day header row of the day plan sidebar:

- **Green badge** — check-in day
- **Red badge** — check-out day
- **Neutral badge** — nights in between (ongoing stay)

Clicking a badge navigates to the linked place. Hotel-type reservations are filtered out of the inline transport card list between places; they do not appear as transport items in the timeline.

## In the Reservations panel

Hotel reservation cards in the Reservations panel show the linked accommodation name (place name) alongside the standard reservation fields such as the confirmation code and status. The check-in and check-out times are displayed in the metadata section of the card when they have been set.

---

**See also:** [Reservations-and-Bookings](Reservations-and-Bookings) · [Transport-Flights-Trains-Cars](Transport-Flights-Trains-Cars) · [Day-Plans-and-Notes](Day-Plans-and-Notes)

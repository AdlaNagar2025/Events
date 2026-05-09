import React from 'react'
import MyBooking from '../../customer/MYEVENTS/MyBooking'
import Calendar from '../../BasicToProviderProfile/Calendar/Calendar'

export default function MyEventsACalender({user}) {
  return (
    <div>
      <Calendar role={user.role} user={user} />
      <MyBooking user={user} />
    </div>
  );
}

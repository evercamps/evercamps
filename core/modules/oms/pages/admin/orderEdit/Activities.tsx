import { DateTime } from 'luxon';
import React from 'react';
import './Activities.scss';

interface CreatedAt {
  value: string;
  timezone: string;
  date: string;
  time: string;
}

interface Activity {
  comment: string;
  customerNotified: number;
  createdAt: CreatedAt;
}

interface Order {
  activities?: Activity[];
}

interface ActivitiesProps {
  order: Order;
}

interface DailyActivity {
  time: string;
  date: string;
  activities: {
    comment: string;
    customerNotified: number;
    time: string;
  }[];
}

export default function Activities({
  order: { activities = [] }
}: ActivitiesProps) {
  const dailyActivities: DailyActivity[] = [];

  activities.forEach((element) => {
    const current = dailyActivities[dailyActivities.length - 1];

    if (!current) {
      dailyActivities.push({
        time: element.createdAt.value,
        date: element.createdAt.date,
        activities: [
          {
            comment: element.comment,
            customerNotified: element.customerNotified,
            time: element.createdAt.time
          }
        ]
      });
    } else if (
      DateTime.fromSQL(element.createdAt.value).startOf('day').equals(
        DateTime.fromSQL(current.time).startOf('day')
      )
    ) {
      current.activities.push({
        comment: element.comment,
        customerNotified: element.customerNotified,
        time: element.createdAt.time
      });
    } else {
      dailyActivities.push({
        time: element.createdAt.value,
        date: element.createdAt.date,
        activities: [
          {
            comment: element.comment,
            customerNotified: element.customerNotified,
            time: element.createdAt.time
          }
        ]
      });
    }
  });

  return (
    <div className="order-activities">
      <h3 className="title">Activities</h3>
      <ul>
        {dailyActivities.map((group, i) => (
          <li key={i} className="group">
            <span>{group.date}</span>

            <ul>
              {group.activities.map((a, k) => (
                <li key={k} className="flex items-center">
                  <span className="dot" />

                  <div className="comment">
                    <span>{a.comment}</span>

                    {a.customerNotified === 1 && (
                      <span className="customer-notified">
                        Customer was notified
                      </span>
                    )}
                  </div>

                  <span className="time">{a.time}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const layout = {
  areaId: 'leftSide',
  sortOrder: 30
};

export const query = `
  query Query {
    order(uuid: getContextValue("orderId")) {
      activities {
        comment
        customerNotified
        createdAt {
          value
          timezone
          date: text(format: "LLL dd")
          time: text(format: "t")
        }
      }
    }
  }
`;
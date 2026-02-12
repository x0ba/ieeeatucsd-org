import { format } from "date-fns";
import { MapPin, Calendar, Users, Utensils, Printer, Image } from "lucide-react";
import type { EventFormData } from "../types";

interface EventReviewSectionProps {
  data: EventFormData;
}

export function EventReviewSection({ data }: EventReviewSectionProps) {
  const formatDate = (timestamp: number) => {
    return format(new Date(timestamp), "MMMM d, yyyy 'at' h:mm a");
  };

  const getRequirements = () => {
    const reqs = [];
    if (data.hasFood) reqs.push({ icon: Utensils, label: "Food" });
    if (data.needsFlyers) reqs.push({ icon: Printer, label: "Flyers" });
    if (data.needsGraphics) reqs.push({ icon: Image, label: "Graphics" });
    return reqs;
  };

  const totalInvoiceAmount = data.invoices.reduce(
    (sum, inv) => sum + (inv.amount || 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Please review all information before submitting. Once submitted, your
          event request will be reviewed by officers.
        </p>
      </div>

      <div className="space-y-6">
        <ReviewSection title="Basic Information">
          <ReviewItem label="Event Name" value={data.eventName} />
          <ReviewItem
            label="Description"
            value={data.eventDescription}
            multiline
          />
          <ReviewItem label="Event Type" value={data.eventType} />
          {data.department && (
            <ReviewItem label="Department" value={data.department} />
          )}
        </ReviewSection>

        <ReviewSection title="Logistics">
          <ReviewItem
            label="Location"
            value={data.location}
            icon={<MapPin className="h-4 w-4" />}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ReviewItem
              label="Start Date"
              value={formatDate(data.startDate)}
              icon={<Calendar className="h-4 w-4" />}
            />
            <ReviewItem
              label="End Date"
              value={formatDate(data.endDate)}
              icon={<Calendar className="h-4 w-4" />}
            />
          </div>
          {data.capacity && (
            <ReviewItem
              label="Capacity"
              value={data.capacity.toString()}
              icon={<Users className="h-4 w-4" />}
            />
          )}
          <ReviewItem label="Event Code" value={data.eventCode} />
        </ReviewSection>

        <ReviewSection title="Requirements">
          <div className="flex flex-wrap gap-2">
            {getRequirements().length === 0 ? (
              <span className="text-sm text-gray-500">No special requirements</span>
            ) : (
              getRequirements().map((req) => (
                <span
                  key={req.label}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                >
                  <req.icon className="h-3.5 w-3.5" />
                  {req.label}
                </span>
              ))
            )}
          </div>
          {data.needsFlyers || data.needsGraphics ? (
            <ReviewItem
              label="Estimated Attendance"
              value={data.estimatedAttendance.toString()}
              icon={<Users className="h-4 w-4" />}
            />
          ) : null}
        </ReviewSection>

        <ReviewSection title="Funding">
          <ReviewItem
            label="AS Funding Requested"
            value={data.needsASFunding ? "Yes" : "No"}
          />
          {data.invoices.length > 0 && (
            <div className="mt-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Invoices ({data.invoices.length})
              </p>
              <div className="space-y-2">
                {data.invoices.map((invoice, idx) => (
                  <div
                    key={invoice._id}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm"
                  >
                    <span className="text-gray-600 dark:text-gray-400">
                      #{idx + 1}: {invoice.vendor}
                    </span>
                    <span className="font-medium">
                      ${invoice.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-2 mt-2 border-t">
                <span className="text-sm font-medium">Total:</span>
                <span className="font-bold text-lg">
                  ${totalInvoiceAmount.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </ReviewSection>
      </div>
    </div>
  );
}

function ReviewSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 pb-2 border-b">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function ReviewItem({
  label,
  value,
  icon,
  multiline = false,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  multiline?: boolean;
}) {
  return (
    <div>
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <div
        className={`flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100 ${
          multiline ? "mt-1" : ""
        }`}
      >
        {icon}
        {multiline ? (
          <p className="whitespace-pre-wrap">{value}</p>
        ) : (
          <span>{value || "-"}</span>
        )}
      </div>
    </div>
  );
}

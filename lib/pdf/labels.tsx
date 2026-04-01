import React from "react";
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { Order, OrderItem, School, Student, DeliveryDate } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";

type LabelOrder = Order & {
  school: School;
  student: Student;
  deliveryDate: DeliveryDate;
  items: OrderItem[];
};

export type LabelFormat = "standard" | "kitchen";

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontSize: 10,
    fontFamily: "Helvetica"
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  label: {
    width: "48%",
    minHeight: 140,
    border: "1 solid #d0d7de",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10
  },
  title: {
    fontSize: 14,
    fontWeight: 700
  },
  meta: {
    marginTop: 4,
    color: "#555"
  },
  alert: {
    marginTop: 8,
    padding: 6,
    borderRadius: 6,
    backgroundColor: "#fde7e7",
    color: "#7a271a"
  },
  kitchen: {
    marginTop: 10,
    paddingTop: 8,
    borderTop: "1 solid #e5e7eb"
  }
});

function LabelCard({ order, labelFormat }: { order: LabelOrder; labelFormat: LabelFormat }) {
  const allergy = order.items.map((item) => item.allergyNotes).find(Boolean) || order.student.dietaryNotes;
  const itemLines = order.items.map((item) => ({
    name: item.itemNameSnapshot,
    additions: item.additions.length ? item.additions.join(", ") : "None",
    removals: item.removals.length ? item.removals.join(", ") : "None"
  }));

  return (
    <View style={styles.label}>
      {labelFormat === "standard" ? (
        <>
          <Text style={styles.title}>{order.student.studentName}</Text>
          <Text style={styles.meta}>
            Grade {order.student.grade} | {order.school.name}
          </Text>
          <Text style={styles.meta}>
            {order.student.teacherName || "Teacher n/a"} {order.student.classroom ? `| Room ${order.student.classroom}` : ""}
          </Text>
          {itemLines.map((item, index) => (
            <View key={`${order.id}-${index}`} style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 12 }}>{item.name}</Text>
              <Text>Add: {item.additions}</Text>
              <Text>No: {item.removals}</Text>
            </View>
          ))}
          <Text>Order: {order.orderNumber}</Text>
          {allergy ? <Text style={styles.alert}>Allergy / diet: {allergy}</Text> : null}
        </>
      ) : (
        <View style={styles.kitchen}>
          <Text style={styles.title}>
            {order.student.studentName.toUpperCase()} | {order.student.grade.toUpperCase()}
          </Text>
          {itemLines.map((item, index) => (
            <View key={`${order.id}-kitchen-${index}`} style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 12 }}>{item.name.toUpperCase()}</Text>
              <Text>ADD: {item.additions.toUpperCase()}</Text>
              <Text>NO: {item.removals.toUpperCase()}</Text>
            </View>
          ))}
          <Text>SCHOOL: {order.school.name.toUpperCase()}</Text>
          {order.student.teacherName ? <Text>TEACHER: {order.student.teacherName.toUpperCase()}</Text> : null}
          <Text>ORDER: {order.orderNumber}</Text>
          <Text style={allergy ? styles.alert : { marginTop: 8 }}>ALERT: {allergy ? allergy.toUpperCase() : "NONE"}</Text>
        </View>
      )}
    </View>
  );
}

function LabelsDocument({ orders, labelFormat }: { orders: LabelOrder[]; labelFormat: LabelFormat }) {
  const titleDate =
    orders[0] &&
    formatInTimeZone(orders[0].deliveryDate.deliveryDate, orders[0].school.timezone, "EEEE, MMM d");

  return (
    <Document title={`Labels ${titleDate ?? ""}`}>
      <Page size="LETTER" style={styles.page}>
        <Text style={{ marginBottom: 12, fontSize: 16 }}>
          {labelFormat === "standard" ? "Student labels" : "Kitchen labels"} {titleDate ? `- ${titleDate}` : ""}
        </Text>
        <View style={styles.grid}>
          {orders.map((order) => (
            <LabelCard key={order.id} order={order} labelFormat={labelFormat} />
          ))}
        </View>
      </Page>
    </Document>
  );
}

export async function generateLabelsPdfBuffer(orders: LabelOrder[], labelFormat: LabelFormat) {
  return renderToBuffer(<LabelsDocument orders={orders} labelFormat={labelFormat} />);
}

export function mapOrderToLabelRows(orders: LabelOrder[]) {
  return orders.map((order) => {
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      studentName: order.student.studentName,
      grade: order.student.grade,
      school: order.school.name,
      teacher: order.student.teacherName ?? "",
      classroom: order.student.classroom ?? "",
      itemName: order.items.map((item) => item.itemNameSnapshot).join(" | "),
      additions: order.items.flatMap((item) => item.additions),
      removals: order.items.flatMap((item) => item.removals),
      alert: order.items.map((item) => item.allergyNotes).find(Boolean) ?? order.student.dietaryNotes ?? ""
    };
  });
}

import { BookingManagementView } from "@/components/BookingManagementView";

const TalentDashboard = () => {
  return (
    <BookingManagementView 
      title="Welcome, {name}!"
      subtitle="Manage your talent profile"
    />
  );
};

export default TalentDashboard;
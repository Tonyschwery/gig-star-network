import { BookingManagementView } from "@/components/BookingManagementView";
import { Header } from "@/components/Header";

const TalentDashboard = () => {
  return (
    <>
      <Header />
      <BookingManagementView 
        title="Welcome, {name}!"
        subtitle="Manage your talent profile"
      />
    </>
  );
};

export default TalentDashboard;
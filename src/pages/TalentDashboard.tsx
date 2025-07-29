import { BookingManagementView } from "@/components/BookingManagementView";
import { Header } from "@/components/Header";

const TalentDashboard = () => {
  return (
    <>
      <Header />
      <div className="pt-24">
        <BookingManagementView 
          title="Welcome, {name}!"
          subtitle="Manage your talent profile and gig opportunities"
        />
      </div>
    </>
  );
};

export default TalentDashboard;
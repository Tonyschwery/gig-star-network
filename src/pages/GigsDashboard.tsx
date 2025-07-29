import { Header } from "@/components/Header";
import { BookingManagementView } from "@/components/BookingManagementView";

const GigsDashboard = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-24">
        <BookingManagementView 
          title="Gigs Dashboard - {name}"
          subtitle="Manage your gig opportunities and direct bookings"
        />
      </div>
    </div>
  );
};

export default GigsDashboard;
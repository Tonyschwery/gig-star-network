import { BookingManagementView } from "@/components/BookingManagementView";
import { Header } from "@/components/Header";

const Gigs = () => {
  return (
    <>
      <Header />
      <BookingManagementView 
        title="Gig Opportunities"
        subtitle="Exclusive opportunities from bookers looking for talented performers like you"
        showGigOpportunities={true}
      />
    </>
  );
};

export default Gigs;
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TalentChatModal } from '@/components/TalentChatModal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Renders the bookings view for a talent user.
 * It fetches and displays a list of bookings, allowing the talent
 * to communicate with bookers via a chat modal.
 */
const TalentDashboardBookings = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { session, user } = useAuth();
  const [selectedBookerId, setSelectedBookerId] = useState<string | null>(null);
  const [isChatModalOpen, setChatModalOpen] = useState(false);

  useEffect(() => {
    /**
     * Fetches the bookings for the currently authenticated talent user.
     * It first retrieves the talent's profile to get their talent ID,
     * then fetches the associated bookings along with the booker's profile information.
     */
    const fetchBookings = async () => {
      if (session?.user?.id) {
        setLoading(true);

        // First, get the talent_profile for the current user to find their talent-specific ID.
        const { data: talentProfile, error: talentProfileError } = await supabase
          .from('talent_profiles')
          .select('id')
          .eq('user_id', session.user.id)
          .single();

        if (talentProfileError) {
          console.error('Error fetching talent profile:', talentProfileError.message);
          setLoading(false);
          return;
        }
        
        if (!talentProfile) {
            // This case handles users who are not registered as talent.
            console.log("No talent profile found for this user.");
            setLoading(false);
            return;
        }

        const talentId = talentProfile.id;

        // Then, fetch all bookings for this talent, joining with the booker's profile info.
        const { data, error } = await supabase
          .from('bookings')
          .select(
            `
            id,
            event_name,
            event_date,
            status,
            booker_id,
            talent_id,
            profiles (
              id,
              full_name,
              avatar_url
            )
          `
          )
          .eq('talent_id', talentId)
          .order('event_date', { ascending: true });

        if (error) {
          console.error('Error fetching bookings:', error.message);
        } else if (data) {
          // With the corrected query, the profile data is already in the 'profiles' property.
          setBookings(data);
        }
        setLoading(false);
      } else {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [session]);

  /**
   * Opens the chat modal for a specific booker.
   * @param bookerId The ID of the booker to chat with.
   */
  const handleOpenChat = (bookerId: string) => {
    setSelectedBookerId(bookerId);
    setChatModalOpen(true);
  };

  /**
   * Closes the chat modal.
   */
  const handleCloseChat = () => {
    setChatModalOpen(false);
    setSelectedBookerId(null);
  };

  // Display a loading state while bookings are being fetched.
  if (loading) {
    return (
        <div className="p-4 md:p-6 space-y-4">
            <h1 className="text-2xl font-bold mb-4">Your Bookings</h1>
            <Skeleton className="h-28 w-full rounded-lg" />
            <Skeleton className="h-28 w-full rounded-lg" />
            <Skeleton className="h-28 w-full rounded-lg" />
        </div>
    )
  }

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-4">Your Bookings</h1>
      {bookings.length === 0 ? (
        <Card>
            <CardContent className="pt-6">
                <p>You have no bookings yet. When a booker hires you, your bookings will appear here.</p>
            </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <Card key={booking.id}>
              <CardHeader>
                <CardTitle>{booking.event_name}</CardTitle>
                <CardDescription>
                    {new Date(booking.event_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                <div className="flex items-center mb-4 sm:mb-0">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={booking.profiles?.avatar_url} alt={booking.profiles?.full_name || 'Booker'} />
                      <AvatarFallback>{booking.profiles?.full_name?.[0].toUpperCase() || 'B'}</AvatarFallback>
                    </Avatar>
                    <div className="ml-4">
                        <p className="font-semibold">{booking.profiles?.full_name}</p>
                        <p className="text-sm text-muted-foreground">Booker</p>
                    </div>
                </div>
                <div className="flex items-center space-x-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                    }`}>
                        {booking.status}
                    </span>
                    <Button variant="outline" onClick={() => handleOpenChat(booking.booker_id)}>Message Booker</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {/* The Chat Modal is rendered here when a booker is selected */}
      {selectedBookerId && user?.id && (
        <TalentChatModal
          isOpen={isChatModalOpen}
          onClose={handleCloseChat}
          bookerId={selectedBookerId}
          talentId={user.id}
        />
      )}
    </div>
  );
};

export default TalentDashboardBookings;

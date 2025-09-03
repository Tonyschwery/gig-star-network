import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarIcon, Clock, MapPin, User, Mail, FileText, MessageCircle, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface EventRequest {
  id: string;
  user_id: string;
  booker_name: string;
  booker_email: string;
  event_date: string;
  event_duration: number;
  event_location: string;
  event_type: string;
  description: string | null;
  status: 'pending' | 'approved' | 'declined' | 'completed';
  created_at: string;
  updated_at: string;
  admin_reply?: string | null;
  replied_at?: string | null;
}

export default function YourRequests() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [requests, setRequests] = useState<EventRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadUserRequests();
  }, [user, navigate]);

  const loadUserRequests = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('event_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setRequests((data || []).map(item => ({
        ...item,
        status: item.status as EventRequest['status']
      })));
    } catch (error) {
      console.error('Error loading requests:', error);
      toast({
        title: "Error",
        description: "Failed to load your event requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: EventRequest['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200">Pending Review</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">Approved</Badge>;
      case 'declined':
        return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">Declined</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-20">
          <div className="container mx-auto px-4 py-8">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-1/4"></div>
              <div className="h-64 bg-muted rounded"></div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
            
            <div>
              <h1 className="text-3xl font-bold mb-2">Your Event Requests</h1>
              <p className="text-muted-foreground">
                Track your direct event requests and view responses from our team
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{requests.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Clock className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {requests.filter(r => r.status === 'pending').length}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">With Replies</CardTitle>
                <MessageCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {requests.filter(r => r.admin_reply).length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Requests List */}
          {requests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-2">No Event Requests Yet</h3>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  You haven't submitted any direct event requests through our "Tell us about your event" feature yet.
                </p>
                <Button onClick={() => navigate('/your-event')}>
                  Submit Event Request
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {requests.map((request) => (
                <Card key={request.id} className="overflow-hidden">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-3 mb-2">
                          <span className="capitalize">{request.event_type} Event</span>
                          {getStatusBadge(request.status)}
                        </CardTitle>
                        <CardDescription>
                          Submitted {format(new Date(request.created_at), 'MMMM dd, yyyy \'at\' h:mm a')}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Request ID</div>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {request.id.slice(0, 8)}
                        </code>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    {/* Event Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Date & Time:</span>
                          <span>{format(new Date(request.event_date), 'MMMM dd, yyyy')}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Duration:</span>
                          <span>{request.event_duration} hours</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Location:</span>
                          <span>{request.event_location}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Contact Name:</span>
                          <span>{request.booker_name}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Contact Email:</span>
                          <span>{request.booker_email}</span>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    {request.description && (
                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-2">Event Description</h4>
                        <p className="text-muted-foreground text-sm bg-muted/50 p-3 rounded">
                          {request.description}
                        </p>
                      </div>
                    )}

                    {/* Admin Reply */}
                    {request.admin_reply ? (
                      <div className="border-t pt-4">
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <MessageCircle className="h-4 w-4 text-green-600" />
                            <h4 className="font-medium text-green-800">Response from QTalents Team</h4>
                          </div>
                          <p className="text-green-700 mb-2">
                            {request.admin_reply}
                          </p>
                          {request.replied_at && (
                            <p className="text-xs text-green-600">
                              Replied on {format(new Date(request.replied_at), 'MMMM dd, yyyy \'at\' h:mm a')}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : request.status === 'pending' ? (
                      <div className="border-t pt-4">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="h-4 w-4 text-yellow-600" />
                            <h4 className="font-medium text-yellow-800">Waiting for Response</h4>
                          </div>
                          <p className="text-yellow-700 text-sm">
                            Our team is reviewing your event request. We'll respond within 24-48 hours with talent recommendations and next steps.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="border-t pt-4">
                        <div className="bg-muted/50 border border-border rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <h4 className="font-medium text-muted-foreground">No Response Yet</h4>
                          </div>
                          <p className="text-muted-foreground text-sm">
                            We haven't provided a detailed response to this request yet. You should have received status updates via email.
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* CTA */}
          <div className="mt-12 text-center">
            <Card>
              <CardContent className="py-8">
                <h3 className="font-semibold mb-2">Need to Submit Another Event Request?</h3>
                <p className="text-muted-foreground mb-4">
                  Tell us about your upcoming event and we'll match you with the perfect talent.
                </p>
                <Button onClick={() => navigate('/your-event')}>
                  Submit New Event Request
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
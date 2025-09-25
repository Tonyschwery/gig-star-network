import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Button,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface BookingNotificationProps {
  recipientName: string
  eventType: string
  eventDate: string
  eventLocation: string
  bookerName: string
  talentName?: string
  bookingStatus: string
  bookingId: string
  appUrl: string
  isForTalent: boolean
  showFullDetails?: boolean
  bookerEmail?: string
  bookerPhone?: string
  description?: string
  eventDuration?: number
  budget?: number
  budgetCurrency?: string
  eventAddress?: string
}

export const BookingNotificationEmail = ({
  recipientName,
  eventType,
  eventDate,
  eventLocation,
  bookerName,
  talentName,
  bookingStatus,
  bookingId,
  appUrl,
  isForTalent,
  showFullDetails = false,
  bookerEmail,
  bookerPhone,
  description,
  eventDuration,
  budget,
  budgetCurrency,
  eventAddress
}: BookingNotificationProps) => {
  const getSubject = () => {
    switch (bookingStatus) {
      case 'pending':
        return isForTalent ? 'New Booking Request' : 'Booking Request Submitted'
      case 'approved':
        return 'Booking Approved'
      case 'declined':
        return 'Booking Declined'
      case 'completed':
        return 'Booking Completed'
      default:
        return 'Booking Update'
    }
  }

  const getMessage = () => {
    const eventDetails = `${eventType} event on ${eventDate} at ${eventLocation}`
    
    switch (bookingStatus) {
      case 'pending':
        return isForTalent 
          ? `You have received a new booking request from ${bookerName} for a ${eventDetails}.`
          : `Your booking request for a ${eventDetails} has been submitted and is awaiting approval.`
      case 'approved':
        return isForTalent
          ? `You have approved the booking request from ${bookerName} for a ${eventDetails}.`
          : `Great news! Your booking request for a ${eventDetails} has been approved by ${talentName}.`
      case 'declined':
        return isForTalent
          ? `You have declined the booking request from ${bookerName} for a ${eventDetails}.`
          : `Your booking request for a ${eventDetails} has been declined by ${talentName}.`
      case 'completed':
        return `The booking for a ${eventDetails} has been completed successfully.`
      default:
        return `There has been an update to your booking for a ${eventDetails}.`
    }
  }

  const getActionText = () => {
    if (bookingStatus === 'pending' && isForTalent) {
      return 'Review Booking Request'
    }
    return 'View Booking Details'
  }

  return (
    <Html>
      <Head />
      <Preview>{getSubject()}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{getSubject()}</Heading>
          <Text style={text}>Hi {recipientName},</Text>
          <Text style={text}>{getMessage()}</Text>
          
          <div style={buttonContainer}>
            <Button
              style={button}
              href={`${appUrl}/talent-dashboard`}
            >
              {getActionText()}
            </Button>
          </div>

          <div style={detailsContainer}>
            <Text style={detailsTitle}>Event Details:</Text>
            <Text style={detailsText}>
              <strong>Type:</strong> {eventType}<br/>
              <strong>Date:</strong> {eventDate}<br/>
              <strong>Location:</strong> {eventLocation}<br/>
              {eventDuration && <><strong>Duration:</strong> {eventDuration} hours<br/></>}
              
              {isForTalent ? (
                <>
                  <strong>Client:</strong> {bookerName}<br/>
                  {showFullDetails && bookerEmail && <><strong>Client Email:</strong> {bookerEmail}<br/></>}
                  {showFullDetails && bookerPhone && <><strong>Client Phone:</strong> {bookerPhone}<br/></>}
                  {showFullDetails && eventAddress && <><strong>Full Address:</strong> {eventAddress}<br/></>}
                  {showFullDetails && budget && <><strong>Budget:</strong> {budget} {budgetCurrency || 'USD'}<br/></>}
                  {showFullDetails && description && <><strong>Description:</strong> {description}<br/></>}
                  
                  {!showFullDetails && (
                    <Text style={upgradeNotice}>
                      <strong>📧 Upgrade to Pro</strong> to see client contact details, budget, and full event description.
                    </Text>
                  )}
                </>
              ) : (
                <>
                  <strong>Booker:</strong> {bookerName}<br/>
                  {talentName && <><strong>Talent:</strong> {talentName}<br/></>}
                  {eventAddress && <><strong>Full Address:</strong> {eventAddress}<br/></>}
                  {budget && <><strong>Budget:</strong> {budget} {budgetCurrency || 'USD'}<br/></>}
                  {description && <><strong>Description:</strong> {description}<br/></>}
                </>
              )}
            </Text>
          </div>

          <Text style={footer}>
            Best regards,<br/>
            The Qtalent.live Team
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default BookingNotificationEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '560px',
}

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
}

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
}

const detailsContainer = {
  margin: '24px 0',
  padding: '20px',
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  border: '1px solid #e9ecef',
}

const detailsTitle = {
  color: '#333',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
}

const detailsText = {
  color: '#666',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
}

const upgradeNotice = {
  color: '#007ee6',
  fontSize: '14px',
  fontStyle: 'italic',
  margin: '12px 0 0 0',
  padding: '12px',
  backgroundColor: '#e3f2fd',
  borderRadius: '6px',
  border: '1px solid #bbdefb',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#007ee6',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
}

const footer = {
  color: '#898989',
  fontSize: '12px',
  lineHeight: '22px',
  marginTop: '32px',
}
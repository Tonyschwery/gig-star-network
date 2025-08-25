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

interface AdminNotificationProps {
  eventType?: string
  notificationType: 'new_booking' | 'payment_completed' | 'new_talent_signup' | 'subscription_upgrade' | 'new_event_request'
  bookerName?: string
  bookerEmail?: string
  bookerUserId?: string
  requesterEmail?: string
  talentName?: string
  talentUserId?: string
  eventDate?: string
  eventLocation?: string
  amount?: string
  currency?: string
  budget?: string
  bookingId?: string
  eventRequestId?: string
  talentId?: string
  description?: string
  requestType?: string
  appUrl: string
}

export const AdminNotificationEmail = ({
  eventType,
  notificationType,
  bookerName,
  bookerEmail,
  bookerUserId,
  requesterEmail,
  talentName,
  talentUserId,
  eventDate,
  eventLocation,
  amount,
  currency,
  budget,
  bookingId,
  eventRequestId,
  talentId,
  description,
  requestType,
  appUrl
}: AdminNotificationProps) => {
  const getSubject = () => {
    switch (notificationType) {
      case 'new_booking':
        return 'New Direct Booking Created'
      case 'new_event_request':
        return 'New Event Request Received'
      case 'payment_completed':
        return 'Payment Completed'
      case 'new_talent_signup':
        return 'New Talent Registration'
      case 'subscription_upgrade':
        return 'Pro Subscription Upgrade'
      default:
        return 'Platform Activity Update'
    }
  }

  const getMessage = () => {
    switch (notificationType) {
      case 'new_booking':
        return `A new direct booking has been created by ${bookerName} for a ${eventType} event${eventDate ? ` on ${eventDate}` : ''}${eventLocation ? ` at ${eventLocation}` : ''}.`
      case 'new_event_request':
        return `A new event request has been submitted by ${bookerName} for a ${eventType} event${eventDate ? ` on ${eventDate}` : ''}${eventLocation ? ` at ${eventLocation}` : ''}. This is an indirect request that needs talent matching.`
      case 'payment_completed':
        return `A payment of ${currency} ${amount} has been completed for a ${eventType} event between ${bookerName} and ${talentName}.`
      case 'new_talent_signup':
        return `A new talent ${talentName} has registered on the platform.`
      case 'subscription_upgrade':
        return `${talentName} has upgraded to a Pro subscription.`
      default:
        return 'Platform activity has occurred.'
    }
  }

  const getActionUrl = () => {
    switch (notificationType) {
      case 'new_booking':
      case 'payment_completed':
        return `${appUrl}/admin/bookings`
      case 'new_event_request':
        return `${appUrl}/admin/event-requests`
      case 'new_talent_signup':
      case 'subscription_upgrade':
        return `${appUrl}/admin/users`
      default:
        return `${appUrl}/admin`
    }
  }

  return (
    <Html>
      <Head />
      <Preview>{getSubject()}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Admin Alert: {getSubject()}</Heading>
          <Text style={text}>Hello Admin,</Text>
          <Text style={text}>{getMessage()}</Text>
          
          <div style={detailsBox}>
            <Text style={detailsTitle}>Contact & User Information:</Text>
            {bookerName && <Text style={detailsItem}><strong>Client Name:</strong> {bookerName}</Text>}
            {bookerEmail && <Text style={detailsItem}><strong>Client Email:</strong> {bookerEmail}</Text>}
            {requesterEmail && <Text style={detailsItem}><strong>User Account Email:</strong> {requesterEmail}</Text>}
            {bookerUserId && <Text style={detailsItem}><strong>User ID:</strong> {bookerUserId}</Text>}
            {requestType && <Text style={detailsItem}><strong>Request Type:</strong> {requestType}</Text>}
            
            {(eventType || eventDate || eventLocation) && (
              <>
                <Text style={detailsTitle}>Event Details:</Text>
                {eventType && <Text style={detailsItem}><strong>Event Type:</strong> {eventType}</Text>}
                {eventDate && <Text style={detailsItem}><strong>Event Date:</strong> {eventDate}</Text>}
                {eventLocation && <Text style={detailsItem}><strong>Location:</strong> {eventLocation}</Text>}
                {budget && currency && <Text style={detailsItem}><strong>Budget:</strong> {currency} {budget}</Text>}
                {description && <Text style={detailsItem}><strong>Description:</strong> {description}</Text>}
              </>
            )}
            
            {talentName && (
              <>
                <Text style={detailsTitle}>Talent Information:</Text>
                <Text style={detailsItem}><strong>Talent Name:</strong> {talentName}</Text>
                {talentUserId && <Text style={detailsItem}><strong>Talent User ID:</strong> {talentUserId}</Text>}
              </>
            )}
            
            {(amount || bookingId || eventRequestId) && (
              <>
                <Text style={detailsTitle}>System References:</Text>
                {amount && currency && <Text style={detailsItem}><strong>Amount:</strong> {currency} {amount}</Text>}
                {bookingId && <Text style={detailsItem}><strong>Booking ID:</strong> {bookingId}</Text>}
                {eventRequestId && <Text style={detailsItem}><strong>Event Request ID:</strong> {eventRequestId}</Text>}
                {talentId && <Text style={detailsItem}><strong>Talent Profile ID:</strong> {talentId}</Text>}
              </>
            )}
          </div>

          <div style={buttonContainer}>
            <Button
              style={button}
              href={getActionUrl()}
            >
              View in Admin Panel
            </Button>
          </div>

          <Text style={footer}>
            Qtalent.live Admin System
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default AdminNotificationEmail

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
  color: '#dc3545',
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

const detailsBox = {
  backgroundColor: '#fff3cd',
  border: '1px solid #ffeaa7',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
}

const detailsTitle = {
  color: '#856404',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
}

const detailsItem = {
  color: '#856404',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '4px 0',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#dc3545',
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
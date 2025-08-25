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
  eventType: string
  notificationType: 'new_booking' | 'payment_completed' | 'new_talent_signup' | 'subscription_upgrade'
  bookerName?: string
  talentName?: string
  eventDate?: string
  eventLocation?: string
  amount?: string
  currency?: string
  bookingId?: string
  talentId?: string
  appUrl: string
}

export const AdminNotificationEmail = ({
  eventType,
  notificationType,
  bookerName,
  talentName,
  eventDate,
  eventLocation,
  amount,
  currency,
  bookingId,
  talentId,
  appUrl
}: AdminNotificationProps) => {
  const getSubject = () => {
    switch (notificationType) {
      case 'new_booking':
        return 'New Booking Created'
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
        return `A new booking has been created by ${bookerName} for a ${eventType} event${eventDate ? ` on ${eventDate}` : ''}${eventLocation ? ` at ${eventLocation}` : ''}.`
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
      case 'new_talent_signup':
      case 'subscription_upgrade':
        return `${appUrl}/admin/talents`
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
            <Text style={detailsTitle}>Details:</Text>
            {bookerName && <Text style={detailsItem}>Booker: {bookerName}</Text>}
            {talentName && <Text style={detailsItem}>Talent: {talentName}</Text>}
            {eventType && <Text style={detailsItem}>Event Type: {eventType}</Text>}
            {eventDate && <Text style={detailsItem}>Event Date: {eventDate}</Text>}
            {eventLocation && <Text style={detailsItem}>Location: {eventLocation}</Text>}
            {amount && currency && <Text style={detailsItem}>Amount: {currency} {amount}</Text>}
            {bookingId && <Text style={detailsItem}>Booking ID: {bookingId}</Text>}
            {talentId && <Text style={detailsItem}>Talent ID: {talentId}</Text>}
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
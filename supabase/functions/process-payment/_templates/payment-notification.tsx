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

interface PaymentNotificationProps {
  recipientName: string
  eventType: string
  eventDate: string
  totalAmount: string
  currency: string
  bookingId: string
  appUrl: string
  isForTalent: boolean
  talentEarnings?: string
  platformCommission?: string
}

export const PaymentNotificationEmail = ({
  recipientName,
  eventType,
  eventDate,
  totalAmount,
  currency,
  bookingId,
  appUrl,
  isForTalent,
  talentEarnings,
  platformCommission
}: PaymentNotificationProps) => {
  const subject = isForTalent ? 'Payment Received' : 'Payment Processed'
  
  return (
    <Html>
      <Head />
      <Preview>{subject} - {eventType} event</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{subject}</Heading>
          <Text style={text}>Hi {recipientName},</Text>
          <Text style={text}>
            {isForTalent 
              ? `Great news! Payment has been processed for your ${eventType} event on ${eventDate}.`
              : `Your payment for the ${eventType} event on ${eventDate} has been processed successfully.`
            }
          </Text>
          
          <div style={paymentDetails}>
            <Text style={paymentTitle}>Payment Details</Text>
            <Text style={paymentItem}>Total Amount: {currency} {totalAmount}</Text>
            {isForTalent && talentEarnings && (
              <>
                <Text style={paymentItem}>Your Earnings: {currency} {talentEarnings}</Text>
                {platformCommission && (
                  <Text style={paymentItem}>Platform Fee: {currency} {platformCommission}</Text>
                )}
              </>
            )}
            <Text style={paymentItem}>Event: {eventType}</Text>
            <Text style={paymentItem}>Date: {eventDate}</Text>
          </div>

          <div style={buttonContainer}>
            <Button
              style={button}
              href={`${appUrl}/talent-dashboard`}
            >
              View Payment Details
            </Button>
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

export default PaymentNotificationEmail

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

const paymentDetails = {
  backgroundColor: '#f8f9fa',
  border: '1px solid #e9ecef',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
}

const paymentTitle = {
  color: '#333',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
}

const paymentItem = {
  color: '#495057',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '4px 0',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#28a745',
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
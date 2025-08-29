-- Storage policy to allow user uploads to 'samples' bucket within their own folder
create policy if not exists "Allow uploads to samples in user folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'samples'
    and (auth.uid()::text = (storage.foldername(name))[1])
  );

-- Triggers for notifications on order lifecycle
-- Notify admin when a new order stage is created (user confirmed order)
DROP TRIGGER IF EXISTS trg_notify_admin_on_order_confirmation ON public.order_stages;
CREATE TRIGGER trg_notify_admin_on_order_confirmation
AFTER INSERT ON public.order_stages
FOR EACH ROW
EXECUTE FUNCTION public.notify_admin_on_order_confirmation();

-- Notify user when payment becomes paid
DROP TRIGGER IF EXISTS trg_notify_user_on_payment_success ON public.order_stages;
CREATE TRIGGER trg_notify_user_on_payment_success
AFTER UPDATE ON public.order_stages
FOR EACH ROW
WHEN (NEW.payment_status = 'paid' AND COALESCE(OLD.payment_status,'') <> 'paid')
EXECUTE FUNCTION public.notify_user_on_payment_success();

-- Notify user on delivery
DROP TRIGGER IF EXISTS trg_notify_user_on_delivery ON public.order_stages;
CREATE TRIGGER trg_notify_user_on_delivery
AFTER UPDATE ON public.order_stages
FOR EACH ROW
WHEN (NEW.stage IN ('order_delivered','delivered','Delivered/Completed','delivered/completed') AND COALESCE(OLD.stage,'') <> NEW.stage)
EXECUTE FUNCTION public.notify_user_on_delivery();
from django.contrib import admin, messages

from .models import Transaction, TransactionEvent, TransitionError


class EventInline(admin.TabularInline):
    model = TransactionEvent
    extra = 0
    can_delete = False
    readonly_fields = ('type', 'actor', 'actor_user', 'note', 'at')


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('reference', 'title', 'merchant', 'client_name', 'amount', 'status', 'escrow_status', 'created_at')
    list_filter = ('status', 'escrow_status', 'kind')
    search_fields = ('reference', 'title', 'merchant__email', 'client_name', 'client_email', 'client_phone')
    readonly_fields = ('reference', 'status', 'escrow_status', 'escrow_updated_at')
    inlines = [EventInline]
    actions = ['confirm_payment']

    @admin.action(description='Confirmer le paiement (fonds bloqués)')
    def confirm_payment(self, request, queryset):
        # En attendant le webhook Bitnob : utile pour tester le parcours en sandbox
        for transaction in queryset:
            try:
                transaction.confirm_payment()
            except TransitionError as error:
                self.message_user(request, f'{transaction.reference} : {error}', messages.ERROR)

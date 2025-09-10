from rest_framework import serializers


class AIAssistantSerializer(serializers.Serializer):
    question = serializers.CharField(required=True, allow_blank=False, write_only=True)
    answer = serializers.CharField(read_only=True)
    session_id = serializers.CharField(max_length=100, required=False)
    chat_id = serializers.UUIDField(required=False)

    def validate(self, attrs):
        if not self.instance and not attrs.get("question"):
            raise serializers.ValidationError({"detail": "Question is required."})
        return attrs


class AIChatMessageSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=["user", "assistant"])
    message = serializers.CharField()
    timestamp = serializers.DateTimeField()


class AIChatSerializer(serializers.Serializer):
    chat_id = serializers.UUIDField()
    title = serializers.CharField()
    messages = AIChatMessageSerializer(many=True)


class UserChatsSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    chats = AIChatSerializer(many=True)

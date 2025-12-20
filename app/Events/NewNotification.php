<?php

namespace App\Events;

use App\Models\Thongbao;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NewNotification implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $notification;

    public function __construct(Thongbao $notification)
    {
        $this->notification = $notification;
    }

    public function broadcastOn(): array
    {
        // Kênh riêng tư: App.Models.Nguoidung.{id}
        return [
            new PrivateChannel('App.Models.Nguoidung.' . $this->notification->ID_NGUOINHAN),
        ];
    }

    public function broadcastAs()
    {
        return 'notification.new';
    }
}
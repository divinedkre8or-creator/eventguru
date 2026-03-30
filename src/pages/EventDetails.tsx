import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, MapPin, Tag, Users, ArrowLeft, Loader2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const EventDetails = () => {
  const { id } = useParams<{ id: string }>();

  const { data: event, isLoading, error } = useQuery({
    queryKey: ["public-event", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*, ticket_types(*)")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-amber" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-background p-6 text-center space-y-4">
        <h1 className="font-heading text-4xl font-800 text-foreground">Event not found</h1>
        <p className="text-muted-foreground font-body">The event you are looking for does not exist or has been removed.</p>
        <Link to="/">
          <Button className="bg-amber text-ink">Return Home</Button>
        </Link>
      </div>
    );
  }

  const { title, description, image_url, venue, city, country, category, date, end_date, ticket_types, is_free } = event;

  // Render Description Markdown simply since it may contain schedule
  const formatDescription = (text: string) => {
    return text.split('\n').map((line, i) => (
      <span key={i}>
        {line}
        <br />
      </span>
    ));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar Minimal */}
      <nav className="border-b border-border bg-card p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-full bg-amber/20 flex items-center justify-center group-hover:bg-amber/30 transition-colors">
              <span className="font-heading font-800 text-amber text-sm">ES</span>
            </div>
            <span className="font-heading font-800 text-lg hidden sm:block">EventStack</span>
          </Link>
          <Button asChild variant="ghost" className="text-muted-foreground hover:text-foreground">
            <Link to="/login">Sign In</Link>
          </Button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Link to="/" className="inline-flex items-center text-sm font-body text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Events
        </Link>

        {/* Banner Section */}
        <div className="w-full aspect-[21/9] sm:aspect-[3/1] bg-card rounded-2xl border border-border overflow-hidden relative shadow-sm">
          {image_url ? (
            <img src={image_url} alt={title} className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/30 bg-muted">
              <ImageIcon className="w-16 h-16" />
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-4">
              <div className="inline-block px-3 py-1 rounded-full bg-amber/10 text-amber text-xs font-heading font-700 uppercase tracking-wider backdrop-blur-sm">
                {category?.replace("-", " ")}
              </div>
              <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-800 text-foreground leading-tight">
                {title}
              </h1>
            </div>

            <div className="prose prose-sm sm:prose-base dark:prose-invert prose-headings:font-heading prose-headings:font-800 prose-a:text-amber max-w-none text-muted-foreground font-body">
              {description ? formatDescription(description) : "No description provided for this event."}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-6 sticky top-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-amber shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-heading font-700 text-sm text-foreground">Date and Time</h3>
                    <p className="text-muted-foreground text-sm font-body mt-1">
                      {new Date(date).toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                    {end_date && (
                      <p className="text-muted-foreground text-sm font-body mt-0.5">
                        Until {new Date(end_date).toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-coral shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-heading font-700 text-sm text-foreground">Location</h3>
                    <p className="text-muted-foreground text-sm font-body mt-1">
                      {venue || "Online Event"}
                    </p>
                    {(city || country) && (
                      <p className="text-muted-foreground text-sm font-body mt-0.5">
                        {[city, country].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-6 space-y-4">
                <h3 className="font-heading font-700 text-lg text-foreground mb-4">Tickets</h3>
                {ticket_types && ticket_types.length > 0 ? (
                  ticket_types.map((ticket: any) => (
                    <div key={ticket.id} className="flex flex-col gap-2 p-3 rounded-lg border border-border bg-background">
                      <div className="flex items-center justify-between">
                        <span className="font-heading font-700 text-sm">{ticket.name}</span>
                        <span className="font-heading font-700 text-amber text-sm">
                          {ticket.price === 0 ? "Free" : `NGN ${ticket.price.toLocaleString()}`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-muted-foreground">Available: {ticket.quantity - ticket.sold}</span>
                        <Button size="sm" className="bg-amber text-ink hover:bg-amber/90 py-1 h-8 text-xs font-heading font-700">
                          {is_free ? "Register" : "Buy Ticket"}
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">No tickets available yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EventDetails;

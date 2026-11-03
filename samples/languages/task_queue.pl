use strict;
use warnings;

my @tasks = (
    { id => 1, title => 'Review changes', done => 0 },
    { id => 2, title => 'Publish package', done => 0 },
);
my $next_id = 3;

sub add_task {
    my ($title) = @_;
    $title =~ s/^\s+|\s+$//g;
    return 0 if $title eq '';
    push @tasks, { id => $next_id++, title => $title, done => 0 };
    return 1;
}

sub complete_task {
    my ($id) = @_;
    for my $task (@tasks) {
        next if $task->{id} != $id;
        $task->{done} = 1;
        return 1;
    }
    return 0;
}

sub pending_tasks {
    return grep { !$_->{done} } @tasks;
}

sub summary {
    my @pending = pending_tasks();
    my $completed = @tasks - @pending;
    return scalar(@pending) . " pending, $completed complete";
}

add_task('Write documentation');
die 'Task was not found' unless complete_task(1);
print summary(), "\n";
print "- $_->{title}\n" for pending_tasks();
